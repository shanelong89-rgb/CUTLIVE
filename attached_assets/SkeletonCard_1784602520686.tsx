import { motion } from "motion/react";

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl bg-neutral-900 border border-white/[0.06]">
      {/* Image skeleton */}
      <motion.div
        className="aspect-[4/3] bg-neutral-800"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Text skeletons */}
      <div className="p-4 space-y-2">
        <motion.div
          className="h-4 bg-neutral-800 rounded w-3/4"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.1,
          }}
        />
        <motion.div
          className="h-3 bg-neutral-800 rounded w-1/2"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
        <div className="flex gap-2 pt-1">
          <motion.div
            className="h-6 w-16 bg-neutral-800 rounded-full"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
          <motion.div
            className="h-6 w-20 bg-neutral-800 rounded-full"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.35,
            }}
          />
        </div>
      </div>
    </div>
  );
}
