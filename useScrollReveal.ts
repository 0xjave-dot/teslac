import { RefObject, useEffect } from 'react'

export function useScrollReveal(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!ref.current) return
    const element = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('reveal-visible')
          observer.unobserve(element)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
}





