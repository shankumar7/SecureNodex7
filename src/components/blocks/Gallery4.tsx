"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";

export interface Gallery4Item {
    id: string;
    title: string;
    description: string;
    href: string;
    image: string;
    source: string;
    date: string;
}

export interface Gallery4Props {
    title?: string;
    description?: string;
    items: Gallery4Item[];
}

const Gallery4 = ({
    title = "Vulnerability Archive",
    description = "Detailed forensic analysis of 50+ real-world IoT security incidents, sourced from leading research papers and cybersecurity archives.",
    items = [],
}: Gallery4Props) => {
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const containerRef = React.useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

    useEffect(() => {
        if (!carouselApi) {
            return;
        }
        const updateSelection = () => {
            setCanScrollPrev(carouselApi.canScrollPrev());
            setCanScrollNext(carouselApi.canScrollNext());
            setCurrentSlide(carouselApi.selectedScrollSnap());
        };
        updateSelection();
        carouselApi.on("select", updateSelection);
        return () => {
            carouselApi.off("select", updateSelection);
        };
    }, [carouselApi]);

    return (
        <section ref={containerRef} className="py-32 bg-slate-50 relative overflow-hidden">
            {/* Dynamic Background Elements - Parallax */}
            <motion.div style={{ y: useTransform(scrollYProgress, [0, 1], [0, 200]) }} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-br from-blue-100/20 to-indigo-100/20 rounded-full blur-3xl opacity-60" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-tr from-indigo-50/30 to-blue-50/30 rounded-full blur-3xl opacity-60" />
            </motion.div>

            <motion.div
                style={{ opacity, y }}
                className="container mx-auto px-4 md:px-8 relative z-10"
            >
                <div className="mb-16 flex items-end justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex flex-col gap-6 max-w-3xl"
                    >
                        <h2 className="text-5xl md:text-6xl lg:text-7xl font-black font-space-grotesk tracking-tighter text-slate-900 leading-[0.85]">
                            {title.split(' ')[0]} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">{title.split(' ').slice(1).join(' ')}.</span>
                        </h2>
                        <p className="text-xl text-slate-600 font-kanit leading-relaxed font-light border-l-4 border-blue-500 pl-6">
                            {description}
                        </p>
                    </motion.div>

                    <div className="hidden shrink-0 gap-3 md:flex">
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => carouselApi?.scrollPrev()}
                            disabled={!canScrollPrev}
                            className="h-14 w-14 rounded-full border-slate-200 bg-white/80 backdrop-blur-xl text-slate-700 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all shadow-sm hover:shadow-blue-200/50"
                        >
                            <ArrowLeft className="size-6" />
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => carouselApi?.scrollNext()}
                            disabled={!canScrollNext}
                            className="h-14 w-14 rounded-full border-slate-200 bg-white/80 backdrop-blur-xl text-slate-700 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all shadow-sm hover:shadow-blue-200/50"
                        >
                            <ArrowRight className="size-6" />
                        </Button>
                    </div>
                </div>

                <div className="w-full relative z-10">
                    <Carousel
                        setApi={setCarouselApi}
                        opts={{
                            align: 'start',
                            loop: true,
                            breakpoints: {
                                "(max-width: 768px)": { dragFree: true },
                            },
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="ml-0 2xl:ml-[max(8rem,calc(50vw-700px))] 2xl:mr-[max(0rem,calc(50vw-700px))] px-4 container mx-auto cursor-grab active:cursor-grabbing py-10">
                            {items.map((item, index) => (
                                <CarouselItem
                                    key={item.id}
                                    className="pl-8 md:basis-1/2 lg:basis-1/3 xl:basis-[28%] max-w-[480px]"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                        viewport={{ once: true, margin: "-50px" }}
                                        transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                                        className="h-full"
                                    >
                                        <a href={item.href} target="_blank" rel="noopener noreferrer" className="group block h-full">
                                            <div className="relative h-full overflow-hidden rounded-[2.5rem] bg-white transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(37,99,235,0.2)] flex flex-col group-hover:-translate-y-4 border border-slate-100">

                                                {/* Image Container */}
                                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                                                    <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors duration-500 z-10 mix-blend-multiply" />
                                                    <img
                                                        src={item.image}
                                                        alt={item.title}
                                                        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3";
                                                        }}
                                                    />

                                                    <div className="absolute top-6 left-6 z-20 flex gap-2">
                                                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold font-mono text-white uppercase tracking-wider border border-white/20 shadow-lg">
                                                            {item.source}
                                                        </span>
                                                    </div>

                                                    {/* Animated Overlay */}
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex flex-col p-8 flex-grow bg-white relative">
                                                    <div className="flex items-center gap-3 mb-5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                        <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-widest">{item.date}</span>
                                                    </div>

                                                    <h3 className="mb-4 text-2xl font-bold font-space-grotesk text-slate-900 leading-[1.1] group-hover:text-blue-600 transition-colors">
                                                        {item.title}
                                                    </h3>

                                                    <p className="text-base text-slate-500 line-clamp-3 font-kanit font-light leading-relaxed mb-8">
                                                        {item.description}
                                                    </p>

                                                    <div className="mt-auto flex items-center gap-2 group/btn">
                                                        <span className="text-xs font-bold text-slate-900 border-b-2 border-slate-900 pb-0.5 group-hover:text-blue-600 group-hover:border-blue-600 transition-all">READ FORENSIC ANALYSIS</span>
                                                        <ArrowRight className="w-4 h-4 text-slate-900 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    </motion.div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>

                    {/* Custom Pagination Line */}
                    <div className="mt-12 flex justify-center items-center gap-1.5">
                        {Array.from({ length: Math.ceil(items.length / 4) }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => carouselApi?.scrollTo(index)}
                                className={`h-1 rounded-full transition-all duration-500 ${currentSlide === index ? "w-12 bg-blue-600" : "w-2 bg-slate-200 hover:bg-slate-300"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </section >
    );
};

export { Gallery4 };
