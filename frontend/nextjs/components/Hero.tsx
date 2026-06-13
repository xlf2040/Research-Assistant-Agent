import Image from "next/image";
import React, { FC, useEffect, useState } from "react";
import InputArea from "./ResearchBlocks/elements/InputArea";
import { motion, AnimatePresence } from "framer-motion";

type THeroProps = {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: (query : string) => void;
};

const Hero: FC<THeroProps> = ({
  promptValue,
  setPromptValue,
  handleDisplayResult,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClickSuggestion = (value: string) => {
    setPromptValue(value);
  };

  // Animation variants for consistent animations
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative overflow-visible min-h-[100vh] flex items-center pt-[60px] sm:pt-[80px] mt-[-60px] sm:mt-[-130px]">
      <motion.div 
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={fadeInUp}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center justify-center w-full py-6 sm:py-8 md:py-16 lg:pt-10 lg:pb-20"
      >
        {/* Header text */}
        <motion.h1 
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-2xl sm:text-3xl md:text-4xl font-medium text-center text-gray-800 mb-8 sm:mb-10 md:mb-12 px-4"
        >
          今天想研究什么？
        </motion.h1>

        {/* Input section with enhanced styling */}
        <motion.div 
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-[800px] pb-6 sm:pb-8 md:pb-10 px-4"
        >
          <div className="relative group">
            <div className="relative bg-white rounded-xl ring-1 ring-gray-200 shadow-sm">
              <InputArea
                promptValue={promptValue}
                setPromptValue={setPromptValue}
                handleSubmit={handleDisplayResult}
              />
            </div>
          </div>
          
          {/* Disclaimer text */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 text-center px-4"
          >
            <p className="text-gray-500 text-sm font-light">
              科研agent助手可能出错，请核实重要信息并检查来源。
            </p>
          </motion.div>
        </motion.div>

        {/* Suggestions section with enhanced styling */}
        <motion.div 
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2 xs:gap-3 md:gap-4 pb-6 sm:pb-8 md:pb-10 px-4 lg:flex-nowrap lg:justify-normal"
        >
          <AnimatePresence>
            {suggestions.map((item, index) => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.4, delay: 0.6 + (index * 0.1) }}
                className="flex h-[38px] sm:h-[42px] cursor-pointer items-center justify-center gap-[6px] rounded-lg 
                         border border-solid border-teal-400/40 bg-gradient-to-r from-teal-50 to-cyan-50 
                         px-2 sm:px-3 py-1 sm:py-2 hover:border-teal-400/80 hover:from-teal-100 
                         hover:to-cyan-100 transition-all duration-300 hover:shadow-md hover:shadow-teal-200/50 min-w-[100px]"
                onClick={() => handleClickSuggestion(item?.name)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <img
                  src={item.icon}
                  alt={item.name}
                  width={18}
                  height={18}
                  className="w-[18px] sm:w-[20px] opacity-70"
                />
                <span className="text-xs sm:text-sm font-medium leading-[normal] text-gray-700">
                  {item.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

type suggestionType = {
  id: number;
  name: string;
  icon: string;
};

const suggestions: suggestionType[] = [
  {
    id: 1,
    name: "帮我研究 ",
    icon: "/img/stock2.svg",
  },
  {
    id: 2,
    name: "文献综述关于 ",
    icon: "/img/hiker.svg",
  },
  {
    id: 3,
    name: "前沿进展在 ",
    icon: "/img/news.svg",
  },
];

export default Hero;
