export function createLetter(
	THREE,
	SVGLoader,
	pathData,
	{
		depth = 4,
		scale = 0.055,
		pink = 0xffc0ec,
		dark = 0x24131f,
		gradientStart = 0.55
	} = {}
) {
	if (!pathData || typeof pathData !== 'string') {
		throw new Error(
			'createLetter: pathData must be a non-empty SVG path string.'
		);
	}

	const svgMarkup = `
		<svg xmlns="http://www.w3.org/2000/svg">
			<path
				d="${pathData}"
				fill="#ffffff"
			/>
		</svg>
	`;

	const loader = new SVGLoader();
	const data = loader.parse(svgMarkup);

	const svgPath = data.paths[0];

	if (!svgPath) {
		throw new Error(
			'createLetter: SVGLoader could not parse the supplied path.'
		);
	}

	/*
	 * Replaces deprecated:
	 * SVGLoader.createShapes(svgPath)
	 */
	const shapes = svgPath.toShapes(true);

	if (!shapes.length) {
		throw new Error(
			'createLetter: supplied SVG path produced no shapes.'
		);
	}

	const group = new THREE.Group();

	for (const shape of shapes) {
		const geometry =
			new THREE.ExtrudeGeometry(shape, {
				depth,

				bevelEnabled: true,
				bevelThickness: 0.06,
				bevelSize: 0.04,
				bevelSegments: 2,

				curveSegments: 16
			});

		geometry.computeBoundingBox();

		if (!geometry.boundingBox) {
			geometry.dispose();
			continue;
		}

		const minX =
			geometry.boundingBox.min.x;

		const maxX =
			geometry.boundingBox.max.x;

		/*
		 * FRONT GRADIENT
		 */
		const frontMaterial =
			new THREE.ShaderMaterial({
				uniforms: {
					uMinX: {
						value: minX
					},

					uMaxX: {
						value: maxX
					},

					uPink: {
						value:
							new THREE.Color(
								pink
							)
					},

					uDark: {
						value:
							new THREE.Color(
								dark
							)
					},

					uGradientStart: {
						value:
							gradientStart
					}
				},

				vertexShader: `
					varying float vLocalX;

					void main() {
						vLocalX = position.x;

						gl_Position =
							projectionMatrix *
							modelViewMatrix *
							vec4(
								position,
								1.0
							);
					}
				`,

				fragmentShader: `
					uniform float uMinX;
					uniform float uMaxX;
					uniform float uGradientStart;

					uniform vec3 uPink;
					uniform vec3 uDark;

					varying float vLocalX;

					void main() {

						float width =
							max(
								uMaxX - uMinX,
								0.0001
							);

						float x =
							(vLocalX - uMinX) /
							width;

						x = clamp(
							x,
							0.0,
							1.0
						);

						float gradient =
							smoothstep(
								uGradientStart,
								1.0,
								x
							);

						vec3 color =
							mix(
								uPink,
								uDark,
								gradient
							);

						gl_FragColor =
							vec4(
								color,
								1.0
							);
					}
				`
			});

		/*
		 * DARK EXTRUSION / SIDES
		 */
		const sideMaterial =
			new THREE.MeshStandardMaterial({
				color: dark,
				roughness: 0.5,
				metalness: 0.05
			});

		const mesh =
			new THREE.Mesh(
				geometry,
				[
					frontMaterial,
					sideMaterial
				]
			);

		group.add(mesh);

		/*
		 * FRONT OUTLINE
		 */
		const outlineMaterial =
			new THREE.LineBasicMaterial({
				color: pink,
				transparent: true,
				opacity: 0.9,
				depthWrite: false
			});

		const outlineZ =
			depth + 0.075;

		/*
		 * Outer outline
		 */
		const outerPoints =
			shape.getPoints(80).map(
				(point) =>
					new THREE.Vector3(
						point.x,
						point.y,
						outlineZ
					)
			);

		if (outerPoints.length > 1) {
			const outerGeometry =
				new THREE.BufferGeometry()
					.setFromPoints(
						outerPoints
					);

			const outerLine =
				new THREE.LineLoop(
					outerGeometry,
					outlineMaterial
				);

			outerLine.renderOrder = 10;

			group.add(outerLine);
		}

		/*
		 * Inner hole outlines
		 */
		for (const hole of shape.holes) {
			const points =
				hole.getPoints(80).map(
					(point) =>
						new THREE.Vector3(
							point.x,
							point.y,
							outlineZ
						)
				);

			if (points.length < 2) {
				continue;
			}

			const holeGeometry =
				new THREE.BufferGeometry()
					.setFromPoints(
						points
					);

			const holeLine =
				new THREE.LineLoop(
					holeGeometry,
					outlineMaterial
				);

			holeLine.renderOrder = 10;

			group.add(holeLine);
		}
	}

	/*
	 * SVG Y is downward.
	 * Three.js Y is upward.
	 */
	group.scale.set(
		scale,
		-scale,
		scale
	);

	/*
	 * Center letter locally.
	 */
	const box =
		new THREE.Box3()
			.setFromObject(group);

	if (!box.isEmpty()) {
		const center =
			box.getCenter(
				new THREE.Vector3()
			);

		group.position.x -= center.x;
		group.position.y -= center.y;
		group.position.z -= center.z;
	}

	/*
	 * Outer container is what HomeScene
	 * should position / rotate / scale.
	 */
	const container =
		new THREE.Group();

	container.add(group);

	container.userData.inner =
		group;

	return container;
}