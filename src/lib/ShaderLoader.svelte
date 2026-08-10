<script>
  import { onMount } from "svelte";

  let canvas;
  let visible = $state(true);

  onMount(() => {
    let renderer;
    let geometry;
    let material;
    let frame;
    let disposed = false;

    async function init() {
      const THREE = await import("three");

      if (disposed || !canvas) return;

      const rendererInstance = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
      });

      renderer = rendererInstance;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      const scene = new THREE.Scene();

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const fillColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--fill")
          .trim() || "#ffc0ec";

     const baseColor = new THREE.Color(fillColor);

/*
	Create two variations of your CSS --fill color.

	We are NOT hardcoding another pink,
	so if you later change --fill,
	the shader palette follows it.
*/
const hsl = {};
baseColor.getHSL(hsl);

const colorLight = new THREE.Color().setHSL(
	hsl.h,
	Math.min(hsl.s * 1.05, 1),
	Math.min(hsl.l + 0.12, 0.92)
);

const colorDeep = new THREE.Color().setHSL(
	hsl.h,
	Math.min(hsl.s * 1.15, 1),
	Math.max(hsl.l - 0.16, 0.18)
);

const uniforms = {
	uProgress: {
		value: 0
	},

	uTime: {
		value: 0
	},

	uResolution: {
		value: new THREE.Vector2(
			window.innerWidth,
			window.innerHeight
		)
	},

	uOrigin: {
		value: new THREE.Vector2(
			1,
			1
		)
	},

	uColorBase: {
		value: baseColor
	},

	uColorLight: {
		value: colorLight
	},

	uColorDeep: {
		value: colorDeep
	},

	uDotSize: {
		value: 17
	}
};

      geometry = new THREE.PlaneGeometry(2, 2);

      material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,

        uniforms,

        vertexShader: `
					varying vec2 vUv;

					void main() {
						vUv = uv;

						gl_Position = vec4(
							position.xy,
							0.0,
							1.0
						);
					}
				`,

        fragmentShader: `
					precision highp float;

varying vec2 vUv;

uniform float uProgress;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform vec3 uColor;

#define PI 3.14159265359


float circle(vec2 p, float radius) {
	float d = length(p);

	/*
		Approximate one-pixel antialiasing
		inside each halftone cell.
	*/
	float aa = 0.028;

	return 1.0 - smoothstep(
		radius - aa,
		radius + aa,
		d
	);
}


void main() {

	/* --------------------------------
	   PIXEL-SPACE HALFTONE GRID
	-------------------------------- */

	float dotSize = 18.0;

	vec2 pixel = gl_FragCoord.xy;

	vec2 grid = pixel / dotSize;

	vec2 cellID = floor(grid);

	vec2 cellUV = fract(grid) - 0.5;


	/* --------------------------------
	   TRANSITION FIELD
	-------------------------------- */

	vec2 screenUV =
		gl_FragCoord.xy / uResolution.xy;

	vec2 p = screenUV - uOrigin;

	/*
		Correct aspect ratio so our
		reveal remains circular.
	*/
	p.x *=
		uResolution.x /
		uResolution.y;

	float distanceFromOrigin =
		length(p);


	/*
		The front expands outward.

		progress 0 → nothing revealed
		progress 1 → entire screen revealed
	*/
	float front =
		mix(
			-0.15,
			1.6,
			uProgress
		);


	/*
		This width creates the region where
		the dot sizes gradually change.

		Increase for a softer, larger
		halftone gradient.
	*/
	float transitionWidth = 0.22;


	float tone =
		1.0 -
		smoothstep(
			front - transitionWidth,
			front + transitionWidth,
			distanceFromOrigin
		);


	/* --------------------------------
	   SUBTLE DOT VARIATION
	-------------------------------- */

	float variation =
		sin(cellID.x * 0.45)
		*
		sin(cellID.y * 0.45)
		*
		0.035;

	tone =
		clamp(
			tone + variation,
			0.0,
			1.0
		);


	/* --------------------------------
	   TONE → CIRCLE RADIUS
	-------------------------------- */

	/*
		This is basically the halftone
		brightness function.

		Dark:
		    radius ≈ 0
		    almost solid overlay

		Midtone:
		    visible circles

		Light:
		    radius > cell corner
		    fully transparent
	*/

	float radius =
		mix(
			-0.02,
			0.78,
			tone
		);


	float hole =
		circle(
			cellUV,
			radius
		);


	/* --------------------------------
	   OUTPUT
	-------------------------------- */

	/*
		hole = 0 → pink
		hole = 1 → transparent

		So the actual webpage underneath
		becomes visible through the dots.
	*/

	float alpha =
		1.0 - hole;


	gl_FragColor =
		vec4(
			uColor,
			alpha
		);
}
				`,
      });

      const mesh = new THREE.Mesh(geometry, material);

      scene.add(mesh);

      /*
				Draw once before removing the temporary
				CSS background. Prevents a flash while
				WebGL initializes.
			*/
      renderer.render(scene, camera);

      canvas.style.background = "transparent";

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const delay = reducedMotion ? 100 : 350;
      const duration = reducedMotion ? 300 : 2200;

      const startTime = performance.now() + delay;

      function easeInOutCubic(t) {
        return t < 0.5
          ? 4.0 * t * t * t
          : 1.0 - Math.pow(-2.0 * t + 2.0, 3.0) / 2.0;
      }

      function animate(time) {
        if (disposed) return;

        uniforms.uTime.value = time * 0.001;

        const elapsed = time - startTime;

        const rawProgress = Math.min(Math.max(elapsed / duration, 0), 1);

        uniforms.uProgress.value = easeInOutCubic(rawProgress);

        renderer.render(scene, camera);

        if (rawProgress < 1) {
          frame = requestAnimationFrame(animate);
        } else {
          /*
						Wait one frame so the fully
						transparent shader gets painted.
					*/
          requestAnimationFrame(() => {
            visible = false;
          });
        }
      }

      function resize() {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        renderer.setSize(window.innerWidth, window.innerHeight, false);

        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }

      window.addEventListener("resize", resize);

      frame = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener("resize", resize);
      };
    }

    let removeResize;

    init().then((cleanup) => {
      removeResize = cleanup;
    });

    return () => {
      disposed = true;

      cancelAnimationFrame(frame);

      removeResize?.();

      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  });
</script>

{#if visible}
  <canvas bind:this={canvas} class="shader-loader" aria-hidden="true"></canvas>
{/if}

<style>
  .shader-loader {
    position: fixed;
    inset: 0;

    width: 100vw;
    height: 100dvh;

    z-index: 99999;

    pointer-events: none;

    /*
			Visible immediately while Three/WebGL
			is initializing.
		*/
    background: var(--fill);
  }
</style>
