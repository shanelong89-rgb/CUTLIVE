import { motion } from "motion/react";
import { useState } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className = "" }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder — scaled up so blur edges don't peek through */}
      <motion.img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(20px)", transform: "scale(1.1)" }}
        animate={loaded ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.15 }}
      />

      {/* Full image — fades in over the blur */}
      <motion.img
        src={src}
        alt={alt}
        className="relative w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
