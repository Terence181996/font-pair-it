"use client"

export const initMouseTracking = () => {
  if (typeof window === 'undefined') return

  const handleMouseMove = (e: MouseEvent) => {
    requestAnimationFrame(() => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      
      document.documentElement.style.setProperty('--mouse-x', x.toString())
      document.documentElement.style.setProperty('--mouse-y', y.toString())
    })
  }

  window.addEventListener('mousemove', handleMouseMove)
  
  // Initialize with center position
  document.documentElement.style.setProperty('--mouse-x', '0.5')
  document.documentElement.style.setProperty('--mouse-y', '0.5')

  return () => {
    window.removeEventListener('mousemove', handleMouseMove)
  }
} 