"use client"

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  AnimatePresence,
  MotionValue,
  animate,
  motion,
  useAnimation,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"

import { cn } from "@/lib/utils"

interface DockContextType {
  height: number
  hovered: boolean
  setIsZooming: (value: boolean) => void
  zoomLevel: MotionValue<number>
  mouseY: MotionValue<number>
  animatingIndexes: number[]
  setAnimatingIndexes: (indexes: number[]) => void
}

const INITIAL_WIDTH = 48

const DockContext = createContext<DockContextType>({
  height: 0,
  hovered: false,
  setIsZooming: () => {},
  zoomLevel: null as unknown as MotionValue<number>,
  mouseY: null as unknown as MotionValue<number>,
  animatingIndexes: [],
  setAnimatingIndexes: () => {},
})

const useDock = () => useContext(DockContext)

interface ComponentProps {
  className?: string
  children: ReactNode
}

function Component({ className, children }: ComponentProps) {
  const [hovered, setHovered] = useState(false)
  const [height, setHeight] = useState(0)
  const dockRef = useRef<HTMLDivElement>(null)
  const isZooming = useRef(false)
  const [animatingIndexes, setAnimatingIndexes] = useState<number[]>([])

  const setIsZooming = useCallback((value: boolean) => {
    isZooming.current = value
    setHovered(!value)
  }, [])

  const zoomLevel = useMotionValue(1)

  useWindowResize(() => {
    setHeight(dockRef.current?.clientHeight || 0)
  })

  const mouseY = useMotionValue(Infinity)

  return (
    <DockContext.Provider
      value={{
        hovered,
        setIsZooming,
        height,
        zoomLevel,
        mouseY,
        animatingIndexes,
        setAnimatingIndexes,
      }}
    >
      <motion.div
        ref={dockRef}
        className={cn(
          "fixed top-4 right-4 flex flex-col items-center w-14 p-2 gap-3 bg-opacity-90 rounded-xl",
          "dark:bg-neutral-900 bg-neutral-50 p-2 no-underline shadow-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/80",
          "shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)]",
          "shadow-[rgba(17,24,28,0.08)_0_0_0_1px,rgba(17,24,28,0.08)_0_1px_2px_-1px,rgba(17,24,28,0.04)_0_2px_4px]",
          "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(0,0,0,0.1),0_2px_2px_0_rgba(0,0,0,0.1),0_4px_4px_0_rgba(0,0,0,0.1),0_8px_8px_0_rgba(0,0,0,0.1)]",
          className
        )}
        onMouseMove={(e) => {
          mouseY.set(e.pageY)
          if (!isZooming.current) {
            setHovered(true)
          }
        }}
        onMouseLeave={() => {
          mouseY.set(Infinity)
          setHovered(false)
        }}
        style={{
          scale: zoomLevel,
        }}
      >
        {children}
      </motion.div>
    </DockContext.Provider>
  )
}

Component.displayName = "Dock"

interface DockCardInnerProps {
  src: string
  id: string
  children?: ReactNode
}

export function DockCardInner({ src, id, children }: DockCardInnerProps) {
  const { animatingIndexes } = useDock()

  return (
    <span className="relative flex justify-center items-center z-0 overflow-hidden w-full h-full rounded-md">
      <motion.img
        className="absolute z-10 opacity-40 filter blur-md transform translate-y-2.5 scale-125 "
        src={src}
        alt=""
      />

      <AnimatePresence>
        {animatingIndexes.includes(parseInt(id)) && children ? (
          <motion.div
            className="relative z-0 h-full w-full rounded-full"
            initial={{ scale: 0, opacity: 0, filter: "blur(4px)" }}
            animate={{
              scale: 1,
              opacity: 1,
              filter: "blur(0px)",
              transition: { type: "spring", delay: 0.2 },
            }}
            exit={{
              scale: 0,
              opacity: 0,
              filter: "blur(4px)",
              transition: { duration: 0 },
            }}
          >
            <div className="h-full w-full flex flex-col items-center justify-center">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {!animatingIndexes.includes(parseInt(id)) ? (
          <motion.img
            layoutId={id}
            className="relative z-0 w-1/2 h-1/2 rounded-full border border-black/30 dark:border-white/10"
            src={src}
            alt=""
          />
        ) : null}
      </AnimatePresence>
    </span>
  )
}

interface DockCardProps {
  children: ReactNode
  id: string
}

export function DockCard({ children, id }: DockCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [elCenterY, setElCenterY] = useState(0)
  const dock = useDock()

  const size = useSpring(INITIAL_WIDTH, {
    stiffness: 320,
    damping: 20,
    mass: 0.1,
  })

  const opacity = useSpring(0, {
    stiffness: 300,
    damping: 20,
  })

  useMousePosition(
    {
      onChange: ({ value }) => {
        const mouseY = value.y
        if (dock.height > 0) {
          const transformedValue =
            INITIAL_WIDTH +
            36 *
              Math.cos((((mouseY - elCenterY) / dock.height) * Math.PI) / 2) **
                12

          if (dock.hovered) {
            animate(size, transformedValue)
          }
        }
      },
    },
    [elCenterY, dock]
  )

  useWindowResize(() => {
    const { y } = cardRef.current?.getBoundingClientRect() || { y: 0 }
    setElCenterY(y + 24)
  })

  const isAnimating = useRef(false)
  const controls = useAnimation()
  const timeoutRef = useRef<number | null>(null)

  const handleClick = () => {
    if (!isAnimating.current) {
      isAnimating.current = true
      dock.setAnimatingIndexes([...dock.animatingIndexes, parseInt(id)])
      opacity.set(0.5)
      controls.start({
        x: -24,
        transition: {
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.5,
        },
      })
    } else {
      isAnimating.current = false
      dock.setAnimatingIndexes(
        dock.animatingIndexes.filter((index) => index !== parseInt(id))
      )
      opacity.set(0)
      controls.start({
        x: 0,
        transition: { duration: 0.5 },
      })
    }
  }

  useEffect(() => {
    const currentTimeout = timeoutRef.current;
    return () => {
      if (currentTimeout) clearTimeout(currentTimeout)
    }
  }, [])

  const distance = useTransform(dock.mouseY, (val) => {
    const bounds = cardRef.current?.getBoundingClientRect() ?? {
      y: 0,
      height: 0,
    }
    return val - bounds.y - bounds.height / 2
  })

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40])
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 })

  return (
    <div className="flex flex-row items-center gap-1" key={id}>
      <motion.button
        ref={cardRef}
        className="rounded-lg border aspect-square dark:border-white/5  border-black/5 border-opacity-10 dark:bg-neutral-800 bg-neutral-100 saturate-90 brightness-90 transition-filter duration-200 hover:saturate-100 hover:brightness-112"
        onClick={handleClick}
        style={{
          width: width,
        }}
        animate={controls}
        whileTap={{ scale: 0.95 }}
      >
        {children}
      </motion.button>

      <AnimatePresence mode="popLayout">
        {dock.animatingIndexes.includes(parseInt(id)) ? (
          <motion.div
            key={id}
            layoutId={id}
            className="rounded-full"
            style={{ opacity }}
          >
            <motion.div
              exit={{ transition: { duration: 0 } }}
              className="w-1.5 h-1.5 rounded-full dark:bg-white bg-black"
              style={{ opacity }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function DockDivider() {
  return (
    <motion.div
      className="w-full flex justify-center p-1.5 cursor-ew-resize"
      drag="x"
      dragConstraints={{ left: -100, right: 50 }}
    >
      <span className="h-0.5 w-full rounded dark:bg-neutral-100/10 bg-neutral-800/10 "></span>
    </motion.div>
  )
}

type UseWindowResizeCallback = (width: number, height: number) => void

function useWindowResize(callback: UseWindowResizeCallback) {
  const callbackRef = useCallbackRef(callback)

  useEffect(() => {
    const handleResize = () => {
      callbackRef(window.innerWidth, window.innerHeight)
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [callbackRef])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useCallbackRef<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  return useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, [])
}

interface MousePositionOptions {
  onChange?: (position: { value: { x: number; y: number } }) => void
}

export function useMousePosition(
  options: MousePositionOptions = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: readonly any[] = []
) {
  const { onChange } = options

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      animate(x, event.clientX)
      animate(y, event.clientY)
    }

    const handleChange = () => {
      if (onChange) {
        onChange({ value: { x: x.get(), y: y.get() } })
      }
    }

    const unsubscribeX = x.on("change", handleChange)
    const unsubscribeY = y.on("change", handleChange)

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      unsubscribeX()
      unsubscribeY()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y, onChange, ...deps])

  return useMemo(
    () => ({
      x,
      y,
    }),
    [x, y]
  )
}

export { Component as Dock, useDock }