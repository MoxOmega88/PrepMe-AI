"use client"

import { motion } from "framer-motion"

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 24,
        opacity: { duration: 0.3 },
        filter: { duration: 0.3 }
      }}
    >
      {children}
    </motion.div>
  )
}
