"use client"

import { useEffect, useState } from "react"
import {
  BlocksIcon,
  CircleIcon,
  HexagonIcon,
  OctagonIcon,
  PentagonIcon,
  SquareIcon,
  TriangleIcon,
} from "lucide-react"

import {
  Dock,
  DockCard,
  DockCardInner,
  DockDivider,
} from "@/components/ui/dock"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent
    const isSmall = window.matchMedia("(max-width: 768px)").matches
    const isMobile = Boolean(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.exec(
        userAgent
      )
    )

    const isDev = process.env.NODE_ENV !== "production"
    if (isDev) setIsMobile(isSmall || isMobile)

    setIsMobile(isSmall && isMobile)
  }, [])

  return isMobile
}

const gradients = [
  "https://products.ls.graphics/mesh-gradients/images/03.-Snowy-Mint_1-p-130x130q80.jpeg",
  "https://products.ls.graphics/mesh-gradients/images/04.-Hopbush_1-p-130x130q80.jpeg",
  "https://products.ls.graphics/mesh-gradients/images/06.-Wisteria-p-130x130q80.jpeg",
  "https://products.ls.graphics/mesh-gradients/images/09.-Light-Sky-Blue-p-130x130q80.jpeg",
  "https://products.ls.graphics/mesh-gradients/images/12.-Tumbleweed-p-130x130q80.jpeg",
  "https://products.ls.graphics/mesh-gradients/images/15.-Perfume_1-p-130x130q80.jpeg",
  null,
  "https://products.ls.graphics/mesh-gradients/images/36.-Pale-Chestnut-p-130x130q80.jpeg",
]

export default function DockAnimation() {
  const openIcons = [
    <CircleIcon key="circle" className="h-8 w-8 fill-black stroke-black rounded-full" />,
    <TriangleIcon key="triangle" className="h-8 w-8 fill-black stroke-black rounded-full" />,
    <SquareIcon key="square" className="h-8 w-8 fill-black stroke-black rounded-full" />,
    <PentagonIcon key="pentagon" className="h-8 w-8 fill-black stroke-black rounded-full" />,
    <HexagonIcon key="hexagon" className="h-8 w-8 fill-black stroke-black rounded-full" />,
    <OctagonIcon key="octagon" className="h-8 w-8 fill-black stroke-black rounded-full" />,
    null,
    <BlocksIcon key="blocks" className="h-8 w-8 fill-black stroke-black rounded-full" />,
  ]

  const isMobile = useIsMobile()

  const responsiveOpenIcons = isMobile
    ? openIcons.slice(3, openIcons.length)
    : openIcons
  const responsiveGradients = isMobile
    ? gradients.slice(3, gradients.length)
    : gradients

  return (
    <Dock>
      {responsiveGradients.map((src, index) =>
        src ? (
          <DockCard key={src} id={`${index}`}>
            <DockCardInner src={src} id={`${index}`}>
              {responsiveOpenIcons[index]}
            </DockCardInner>
          </DockCard>
        ) : (
          <DockDivider key={index} />
        )
      )}
    </Dock>
  )
}

