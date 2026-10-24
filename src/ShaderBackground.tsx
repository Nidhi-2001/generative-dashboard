// Animated gradient behind the header: one fragment shader on a raw WebGL canvas.
// Domain-warped fbm noise (Book of Shaders ch. 13) tinted with the app's indigo and
// emerald, fading into the page background at the bottom edge.
//
// Respects prefers-reduced-motion (draws one still frame), pauses when off screen
// or in a background tab, and falls back to a CSS gradient if WebGL is unavailable.
import { useEffect, useRef, useState } from 'react'

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAGMENT = `
// The hash needs real float precision; mediump is 16-bit on many phones and
// turns the noise into visible blocks.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;                    // 0..1, y up
  // scale by the longer side so shapes stay a similar size on a wide desktop
  // header and a tall phone one; low frequency = big, soft shapes
  vec2 p = gl_FragCoord.xy / max(u_res.x, u_res.y) * 2.4;
  float t = u_time * 0.05;

  // warp the domain twice so the noise folds into slow, liquid shapes
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 1.8 * q + vec2(1.7, 9.2) + 1.5 * t),
                fbm(p + 1.8 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 1.6 * r);

  vec3 base    = vec3(0.008, 0.024, 0.090); // slate-950, the page background
  vec3 indigo  = vec3(0.486, 0.549, 1.000); // #7c8cff
  vec3 emerald = vec3(0.243, 0.812, 0.557); // #3ecf8e

  vec3 col = mix(base, indigo, smoothstep(0.3, 0.8, f) * 0.5);
  col = mix(col, emerald, smoothstep(0.5, 0.85, r.x) * 0.3);
  col = mix(base, col, smoothstep(0.0, 0.65, uv.y));     // fade into the page

  gl_FragColor = vec4(col, 1.0);
}
`

// It's a soft gradient, so half resolution is indistinguishable and 4x cheaper;
// the browser's bilinear upscale also smooths out any colour banding.
const RESOLUTION_SCALE = 0.5

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader compile failed:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Shader link failed:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

/**
 * @param pulseKey change it (e.g. to the current question) to briefly speed the
 *   animation up, so the header reacts when a new dashboard is built.
 */
export function ShaderBackground({ pulseKey, className = '' }: { pulseKey?: unknown; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boost = useRef(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    boost.current = 1
  }, [pulseKey])

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' })
    const program = gl && createProgram(gl)
    if (!canvas || !gl || !program) {
      setFailed(true)
      return
    }

    // One triangle that covers the whole viewport.
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.useProgram(program)
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(program, 'u_res')
    const uTime = gl.getUniformLocation(program, 'u_time')

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let time = 20 // start mid-flow rather than on the first, flatter frame
    let last = performance.now()
    let raf = 0
    let onScreen = true

    const draw = () => {
      gl.uniform1f(uTime, time)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1) // don't jump after a stall
      last = now
      time += dt * (1 + 6 * boost.current)
      boost.current *= 0.97
      draw()
      raf = requestAnimationFrame(frame)
    }

    const update = () => {
      cancelAnimationFrame(raf)
      if (onScreen && !document.hidden && !reducedMotion.matches) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else {
        draw()
      }
    }

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * RESOLUTION_SCALE
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      draw() // resizing clears the canvas
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      update()
    })
    intersectionObserver.observe(canvas)
    const onContextLost = (e: Event) => {
      e.preventDefault()
      setFailed(true)
    }

    document.addEventListener('visibilitychange', update)
    reducedMotion.addEventListener('change', update)
    canvas.addEventListener('webglcontextlost', onContextLost)
    resize()
    update()

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', update)
      reducedMotion.removeEventListener('change', update)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [])

  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      {failed ? (
        <div className="h-full w-full bg-[radial-gradient(ellipse_at_20%_10%,rgba(124,140,255,0.35),transparent_60%),radial-gradient(ellipse_at_80%_0%,rgba(62,207,142,0.2),transparent_55%)]" />
      ) : (
        <canvas ref={canvasRef} className="h-full w-full" />
      )}
    </div>
  )
}
