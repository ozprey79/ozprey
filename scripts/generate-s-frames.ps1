# Run on Windows to regenerate the portable SVG outlines (no runtime fonts).
Add-Type -AssemblyName System.Drawing
$families = @('Bodoni MT', 'Arial Black', 'Baskerville Old Face', 'Bauhaus 93', 'Georgia', 'Broadway', 'Garamond', 'Impact', 'Cooper Black', 'Century Gothic', 'Brush Script MT', 'Rockwell', 'Algerian', 'Bell MT', 'Stencil', 'Elephant', 'Agency FB', 'Lucida Calligraphy', 'Times New Roman', 'Berlin Sans FB', 'Old English Text MT', 'Monotype Corsiva', 'Verdana', 'Engravers MT')
$frames = foreach ($name in $families) {
    $font = [System.Drawing.FontFamily]::new($name)
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddString('S', $font, 0, 240, [System.Drawing.PointF]::new(0,0), [System.Drawing.StringFormat]::GenericTypographic)
    $bounds = $path.GetBounds()
    $scale = [Math]::Min(184 / $bounds.Width, 210 / $bounds.Height)
    $matrix = [System.Drawing.Drawing2D.Matrix]::new([single]$scale,0,0,[single]$scale,[single](160-($bounds.X+$bounds.Width/2)*$scale),[single](160-($bounds.Y+$bounds.Height/2)*$scale))
    $path.Transform($matrix)
    $points = $path.PathPoints
    $types = $path.PathTypes
    $d = [System.Text.StringBuilder]::new()
    for ($i=0; $i -lt $points.Length; $i++) {
        $kind = $types[$i] -band 7
        $command = if ($kind -eq 0) {'M'} elseif ($kind -eq 1) {'L'} else {'C'}
        [void]$d.Append($command)
        $count = if ($kind -eq 3) {3} else {1}
        for ($j=0; $j -lt $count; $j++) {
            if ($j -gt 0) {$i++}
            [void]$d.AppendFormat([Globalization.CultureInfo]::InvariantCulture, '{0:0.###},{1:0.###} ', $points[$i].X, $points[$i].Y)
        }
        if ($types[$i] -band 128) {[void]$d.Append('Z')}
    }
    @{name=$name; d=$d.ToString()}
    $matrix.Dispose(); $path.Dispose(); $font.Dispose()
}
$output = Join-Path $PSScriptRoot '../src/lib/home/loaders/sFrames.json'
$frames | ConvertTo-Json | Set-Content -LiteralPath $output -Encoding utf8
