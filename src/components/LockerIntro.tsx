import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LockerIntroProps {
  onEnter: () => void;
  redirectTo?: string;
}

const LockerIntro = ({ onEnter }: LockerIntroProps) => {
  const [isOpening, setIsOpening] = useState(false);
  const [isDialRotating, setIsDialRotating] = useState(false);

  const handleClick = () => {
    if (isDialRotating) return;
    setIsDialRotating(true);
    setTimeout(() => {
      setIsOpening(true);
      setTimeout(() => {
        onEnter();
      }, 2000);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {!isOpening ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background cursor-pointer"
          onClick={handleClick}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background glow effects */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          <motion.div 
            className="relative flex flex-col items-center gap-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Vault/Locker */}
            <motion.div
              className="relative w-64 h-72 md:w-80 md:h-96 rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-2xl border-4 border-orange-300/50"
              whileHover={!isDialRotating ? { scale: 1.02 } : {}}
              whileTap={!isDialRotating ? { scale: 0.98 } : {}}
              style={{
                boxShadow: "0 25px 50px -12px rgba(249, 115, 22, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)"
              }}
            >
              {/* Vault door frame */}
              <div className="absolute inset-3 rounded-2xl border-4 border-orange-700/30" />
              
              {/* Vault rivets */}
              {[
                "top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4",
                "top-4 left-1/2 -translate-x-1/2", "bottom-4 left-1/2 -translate-x-1/2",
                "top-1/2 -translate-y-1/2 left-4", "top-1/2 -translate-y-1/2 right-4"
              ].map((pos, i) => (
                <div
                  key={i}
                  className={`absolute ${pos} w-3 h-3 rounded-full bg-orange-700/60 shadow-inner`}
                />
              ))}
              
              {/* Vault dial/lock mechanism - White with rotating animation */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div 
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-white to-gray-100 border-4 border-orange-600 shadow-lg flex items-center justify-center"
                  animate={isDialRotating ? { rotate: [0, 360, 720, 360, 540] } : {}}
                  transition={{ duration: 1.4, ease: "easeInOut" }}
                >
                  {/* Dial markings */}
                  <div className="absolute inset-2 rounded-full border-2 border-orange-300/50" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <div
                      key={deg}
                      className="absolute w-1 h-3 bg-orange-400 rounded-full"
                      style={{
                        transform: `rotate(${deg}deg) translateY(-36px)`,
                        transformOrigin: 'center center'
                      }}
                    />
                  ))}
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-white to-gray-200 border-2 border-orange-400/50 flex items-center justify-center shadow-inner">
                    {/* Chat bubble icon */}
                    <svg 
                      viewBox="0 0 24 24" 
                      className="w-10 h-10 md:w-12 md:h-12 text-orange-500 fill-current"
                    >
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                </motion.div>
              </div>
              
              {/* Handle */}
              <motion.div
                className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-16 md:w-8 md:h-20 bg-gradient-to-b from-orange-300 to-orange-500 rounded-full border-2 border-orange-600 shadow-lg"
                animate={isDialRotating ? { x: [0, 4, 0] } : {}}
                transition={{ duration: 0.3, delay: 1.2 }}
              />
              
              {/* R-Vault text on vault */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <span className="text-xl md:text-2xl font-bold text-orange-900/70 tracking-wider">R-VAULT</span>
              </div>
            </motion.div>
            
            {/* Click to enter text */}
            <motion.p
              className="text-muted-foreground text-lg font-medium"
              animate={{ opacity: isDialRotating ? 0 : [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isDialRotating ? "" : "Click to enter"}
            </motion.p>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden"
        >
          {/* Vault door opening animation - Single door swinging open */}
          <motion.div
            className="relative flex items-center justify-center"
            style={{ perspective: 1200 }}
            initial={{ scale: 1 }}
            animate={{ scale: 6 }}
            transition={{ 
              duration: 1.6, 
              ease: "easeInOut",
              delay: 0.8
            }}
          >
            {/* 3D Vault interior - looks like an empty box going inward */}
            <div 
              className="relative w-64 h-72 md:w-80 md:h-96"
              style={{ transformStyle: "preserve-3d", perspective: 800 }}
            >
              {/* Back wall of the vault */}
              <motion.div
                className="absolute inset-4 rounded-xl"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 0.75 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{
                  background: "linear-gradient(145deg, #7c2d12 0%, #9a3412 30%, #7c2d12 100%)",
                  boxShadow: "inset 0 0 40px rgba(0,0,0,0.6)",
                  transform: "translateZ(-80px) scale(0.75)",
                }}
              />

              {/* Top inner wall - trapezoid effect */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-16 overflow-hidden rounded-t-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(180deg, #c2410c 0%, #9a3412 100%)",
                    clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)",
                  }}
                />
              </motion.div>

              {/* Bottom inner wall */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden rounded-b-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(0deg, #7c2d12 0%, #9a3412 100%)",
                    clipPath: "polygon(15% 0, 85% 0, 100% 100%, 0 100%)",
                  }}
                />
              </motion.div>

              {/* Left inner wall */}
              <motion.div
                className="absolute top-0 left-0 bottom-0 w-16 overflow-hidden rounded-l-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, #b45309 0%, #92400e 100%)",
                    clipPath: "polygon(0 0, 100% 15%, 100% 85%, 0 100%)",
                  }}
                />
              </motion.div>

              {/* Right inner wall */}
              <motion.div
                className="absolute top-0 right-0 bottom-0 w-16 overflow-hidden rounded-r-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(-90deg, #92400e 0%, #78350f 100%)",
                    clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)",
                  }}
                />
              </motion.div>

              {/* Ambient light glow from inside */}
              <motion.div
                className="absolute inset-0 rounded-3xl overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <div 
                  className="absolute inset-0"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(251,191,36,0.3) 0%, rgba(234,88,12,0.15) 40%, transparent 70%)",
                  }}
                />
              </motion.div>

              {/* Vault border/frame ring */}
              <div 
                className="absolute inset-0 rounded-3xl border-4 border-orange-800/60"
                style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.4), 0 0 15px rgba(234,88,12,0.3)" }}
              />
              
              {/* Single vault door swinging open to the left */}
              <motion.div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 border-4 border-orange-300/50"
                initial={{ rotateY: 0 }}
                animate={{ rotateY: -110 }}
                transition={{ 
                  duration: 1.4, 
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                style={{ 
                  transformStyle: "preserve-3d",
                  transformOrigin: "left center",
                  boxShadow: "0 25px 50px -12px rgba(249, 115, 22, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)",
                  willChange: "transform"
                }}
              >
                {/* Door frame on vault door */}
                <div className="absolute inset-3 rounded-2xl border-4 border-orange-700/30" />
                
                {/* Vault rivets on door */}
                {[
                  "top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4",
                  "top-4 left-1/2 -translate-x-1/2", "bottom-4 left-1/2 -translate-x-1/2",
                  "top-1/2 -translate-y-1/2 left-4", "top-1/2 -translate-y-1/2 right-4"
                ].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute ${pos} w-3 h-3 rounded-full bg-orange-700/60 shadow-inner`}
                  />
                ))}
                
                {/* White dial on door */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-white to-gray-100 border-4 border-orange-600 shadow-lg flex items-center justify-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-white to-gray-200 border-2 border-orange-400/50 flex items-center justify-center shadow-inner">
                      <svg 
                        viewBox="0 0 24 24" 
                        className="w-10 h-10 md:w-12 md:h-12 text-orange-500 fill-current"
                      >
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Handle on door */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-16 md:w-8 md:h-20 bg-gradient-to-b from-orange-300 to-orange-500 rounded-full border-2 border-orange-600 shadow-lg" />
                
                {/* R-Vault text */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <span className="text-xl md:text-2xl font-bold text-orange-900/70 tracking-wider">R-VAULT</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Fade to content */}
          <motion.div
            className="absolute inset-0 bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.6 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LockerIntro;
