export interface ComposeSnippet {
  id: string;
  fileName: string;
  title: string;
  description: string;
  code: string;
}

export const KOTLIN_COMPOSE_SNIPPETS: ComposeSnippet[] = [
  {
    id: 'theme',
    fileName: 'ZunoTheme.kt',
    title: 'ZUNO Renk Sistemi ve Tema',
    description: 'Koyu gece siyahı arka plan, antrasit yüzeyler ve tutarlı canlı mor / elektrik mavisi vurgu renkleri.',
    code: `package com.zuno.music.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ZunoMidnightBg = Color(0xFF07090E)
val ZunoAnthracite = Color(0xFF11151E)
val ZunoSmokeSurface = Color(0xFF181E2A)
val ZunoVibrantPurple = Color(0xFF9B72FF)
val ZunoElectricBlue = Color(0xFF4DA6FF)

private val ZunoDarkColors = darkColorScheme(
    primary = ZunoVibrantPurple,
    secondary = ZunoElectricBlue,
    background = ZunoMidnightBg,
    surface = ZunoAnthracite,
    surfaceVariant = ZunoSmokeSurface,
    onBackground = Color(0xFFF2F5F9),
    onSurface = Color(0xFFF2F5F9),
    onSurfaceVariant = Color(0xFF8A95A8)
)

@Composable
fun ZunoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    accentColor: Color = ZunoVibrantPurple,
    content: @Composable () -> Unit
) {
    val scheme = if (darkTheme) ZunoDarkColors.copy(primary = accentColor)
    else lightColorScheme(primary = accentColor)
    MaterialTheme(colorScheme = scheme, content = content)
}`,
  },
  {
    id: 'flowing-tabs',
    fileName: 'FlowingBottomBar.kt',
    title: 'Akan Sekmeler (Spring Bottom Nav)',
    description: 'Ön ve arka kenarları farklı yay sertlikleriyle esneyen akışkan alt navigasyon göstergesi.',
    code: `@Composable
fun FlowingBottomBar(
    tabs: List<ZunoTab>,
    selectedIndex: Int,
    accent: Color,
    onSelect: (Int) -> Unit
) {
    val animLead by animateFloatAsState(
        targetValue = selectedIndex.toFloat(),
        animationSpec = spring(dampingRatio = 0.58f, stiffness = 420f)
    )
    val animTrail by animateFloatAsState(
        targetValue = selectedIndex.toFloat(),
        animationSpec = spring(dampingRatio = 0.80f, stiffness = 210f)
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .clip(CircleShape)
            .background(Color(0xFF141923).copy(alpha = 0.92f))
    ) {
        Canvas(modifier = Modifier.matchParentSize()) {
            val tabW = size.width / tabs.size
            val left = minOf(animLead, animTrail) * tabW + 6.dp.toPx()
            val right = (maxOf(animLead, animTrail) + 1f) * tabW - 6.dp.toPx()
            drawRoundRect(
                color = accent,
                topLeft = Offset(left, 6.dp.toPx()),
                size = Size((right - left).coerceAtLeast(tabW * 0.5f), size.height - 12.dp.toPx()),
                cornerRadius = CornerRadius(999f, 999f)
            )
        }
        Row(modifier = Modifier.fillMaxWidth().height(60.dp)) {
            tabs.forEachIndexed { idx, tab ->
                IconButton(
                    onClick = { onSelect(idx) },
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    Icon(tab.icon, contentDescription = tab.label)
                }
            }
        }
    }
}`,
  },
  {
    id: 'liquid-slider',
    fileName: 'LiquidWaveSlider.kt',
    title: 'Sıvı Slider (Oynatıcı İlerleme Çubuğu)',
    description: 'Sinüs dalgalı sıvı dolumu ve yumuşak yıldız şeklinde tutamaca sahip Compose Canvas slider.',
    code: `@Composable
fun LiquidWaveSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
    accent: Color,
    waveAmp: Float = 1f,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition()
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (Math.PI * 2).toFloat(),
        animationSpec = infiniteRepeatable(tween(2200, easing = LinearEasing))
    )
    val smoothVal by animateFloatAsState(
        targetValue = value.coerceIn(0f, 1f),
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 280f)
    )
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp)
            .pointerInput(Unit) {
                detectHorizontalDragGestures { change, _ ->
                    onValueChange((change.position.x / size.width).coerceIn(0f, 1f))
                }
            }
    ) {
        val trackRadius = size.height / 2f
        val fillX = trackRadius + (size.width - size.height) * smoothVal
        val wavePath = Path().apply {
            moveTo(0f, 0f)
            lineTo(fillX, 0f)
            for (y in 0..size.height.toInt() step 4) {
                val dx = sin((y / size.height) * 7.5f - phase) * (5.dp.toPx() * waveAmp)
                lineTo(fillX + dx, y.toFloat())
            }
            lineTo(0f, size.height)
            close()
        }
        clipPath(Path().apply {
            addRoundRect(RoundRect(0f, 0f, size.width, size.height, CornerRadius(trackRadius)))
        }) {
            drawRect(Color(0xFF181E2A))
            drawPath(wavePath, color = accent)
        }
        drawCircle(color = Color(0xFF0E121A), radius = trackRadius * 0.7f, center = Offset(fillX, trackRadius))
    }
}`,
  },
  {
    id: 'morphing-switch',
    fileName: 'MorphingSwitch.kt',
    title: 'Yumuşak Anahtar (Morphing Switch)',
    description: 'Açıldığında dairesel düğmeden yumuşak yıldız formuna dönüşen yaylı anahtar.',
    code: `@Composable
fun MorphingSwitch(
    checked: Boolean,
    accent: Color,
    onCheckedChange: (Boolean) -> Unit
) {
    val progress by animateFloatAsState(
        targetValue = if (checked) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 220f)
    )
    Canvas(
        modifier = Modifier
            .size(width = 60.dp, height = 34.dp)
            .clickable { onCheckedChange(!checked) }
    ) {
        val r = size.height / 2f
        drawRoundRect(
            color = lerp(Color(0xFF1B2C2E), accent, progress),
            cornerRadius = CornerRadius(r, r)
        )
        val cx = r + (size.width - size.height) * progress
        val knobR = size.height * 0.36f * (0.75f + 0.25f * progress)
        val path = Path()
        for (i in 0 until 120) {
            val theta = (i / 120f) * (Math.PI * 2).toFloat()
            val starMod = 1f + (0.12f * progress) * cos(10f * theta)
            val px = cx + cos(theta + progress * 2f) * knobR * starMod
            val py = r + sin(theta + progress * 2f) * knobR * starMod
            if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
        }
        path.close()
        drawPath(path, color = if (checked) Color(0xFF0D141F) else Color(0xFF84A0A0))
    }
}`,
  },
];
