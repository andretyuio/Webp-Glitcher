import React, { useMemo } from 'react';
import { FilterSettings } from '../types';

interface SvgFiltersProps {
    filters: FilterSettings;
}

const SvgFilters: React.FC<SvgFiltersProps> = ({ filters }) => {
    const getAnimationValues = (baseVal: number, minPct: number, maxPct: number, type: string) => {
        const minVal = baseVal * (minPct / 100);
        const maxVal = baseVal * (maxPct / 100);
        switch (type) {
            case 'sweep':
                return `${minVal};${maxVal};${minVal}`;
            case 'flicker':
                const flickerValues = Array.from({ length: 5 }, () => Math.random() * (maxVal - minVal) + minVal);
                return [baseVal, ...flickerValues, baseVal].map(v => v.toFixed(2)).join(';');
            case 'pulse':
            default:
                return `${baseVal};${minVal};${maxVal};${baseVal}`;
        }
    };
    
    const getMotionBlurStdDeviation = () => {
        const angleRad = (filters.blur.angle * Math.PI) / 180;
        const x = Math.abs(filters.blur.amount * Math.cos(angleRad));
        const y = Math.abs(filters.blur.amount * Math.sin(angleRad));
        return `${x} ${y}`;
    }
    
    const getSlitScanAnimationValues = () => {
        const { amount, animationMinAmount, animationMaxAmount, animationType } = filters.slitScan;
        return getAnimationValues(amount, animationMinAmount, animationMaxAmount, animationType);
    };

    const getImageEffectsMatrix = () => {
        switch(filters.imageEffects.type) {
        case 'sepia': return "0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0";
        case 'invert': return "-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0";
        default: return "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
        }
    }
    
    const getPixelateAnimationValues = (attr: 'width' | 'height' | 'radius') => {
        const { size, animationMinAmount, animationMaxAmount, animationType } = filters.pixelate;
        const baseVal = attr === 'radius' ? size / 2 : size;
        return getAnimationValues(baseVal, animationMinAmount, animationMaxAmount, animationType);
    }

    const getAnimationValuesForXY = (baseX: number, baseY: number, minPct: number, maxPct: number, type: string) => {
        const getStdDev = (amtX: number, amtY: number) => `${amtX.toFixed(2)} ${amtY.toFixed(2)}`;
        const minX = baseX * (minPct / 100);
        const minY = baseY * (minPct / 100);
        const maxX = baseX * (maxPct / 100);
        const maxY = baseY * (maxPct / 100);
        
        const baseVal = getStdDev(baseX, baseY);
        const minVal = getStdDev(minX, minY);
        const maxVal = getStdDev(maxX, maxY);

        switch (type) {
            case 'sweep':
                return `${minVal};${maxVal};${minVal}`;
            case 'flicker':
                const randomBetween = () => {
                    const randX = Math.random() * (maxX - minX) + minX;
                    const randY = Math.random() * (maxY - minY) + minY;
                    return getStdDev(randX, randY);
                };
                const flickerValues = Array.from({ length: 5 }, randomBetween);
                return [baseVal, ...flickerValues, baseVal].join(';');
            case 'pulse':
            default:
                return `${baseVal};${minVal};${maxVal};${baseVal}`;
        }
    };
    
    const getBlurAnimationValues = () => {
        const { type, amountX, amountY, animationMinAmount, animationMaxAmount, animationType, amount, angle } = filters.blur;
        
        if (type === 'gaussian') {
            return getAnimationValuesForXY(amountX, amountY, animationMinAmount, animationMaxAmount, animationType);
        } 
        // motion
        const angleRad = (angle * Math.PI) / 180;
        const baseValX = Math.abs(amount * Math.cos(angleRad));
        const baseValY = Math.abs(amount * Math.sin(angleRad));
        return getAnimationValuesForXY(baseValX, baseValY, animationMinAmount, animationMaxAmount, animationType);
    }
    
    const getSliceShiftAnimationValues = () => {
        const { offsetAmount, animationMinAmount, animationMaxAmount, animationType } = filters.sliceShift;
        return getAnimationValues(offsetAmount, animationMinAmount, animationMaxAmount, animationType);
    }

    const getChannelShiftOffsets = (offset: number, angle: number) => {
        const angleRad = (angle * Math.PI) / 180;
        return {
        dx: (offset * Math.cos(angleRad)).toFixed(2),
        dy: (offset * Math.sin(angleRad)).toFixed(2),
        };
    };

    const getChannelShiftAnimateValues = (offset: number, angle: number) => {
        const { animationType, animationMinAmount, animationMaxAmount } = filters.channelShift;
        const baseValues = getAnimationValues(offset, animationMinAmount, animationMaxAmount, animationType).split(';');
        const angleRad = (angle * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const dxValues = baseValues.map(v => (parseFloat(v) * cos).toFixed(2)).join(';');
        const dyValues = baseValues.map(v => (parseFloat(v) * sin).toFixed(2)).join(';');
        return { dxValues, dyValues };
    };

    const rChan = getChannelShiftOffsets(filters.channelShift.rOffset, filters.channelShift.rAngle);
    const gChan = getChannelShiftOffsets(filters.channelShift.gOffset, filters.channelShift.gAngle);
    const bChan = getChannelShiftOffsets(filters.channelShift.bOffset, filters.channelShift.bAngle);
    const rAnim = getChannelShiftAnimateValues(filters.channelShift.rOffset, filters.channelShift.rAngle);
    const gAnim = getChannelShiftAnimateValues(filters.channelShift.gOffset, filters.channelShift.gAngle);
    const bAnim = getChannelShiftAnimateValues(filters.channelShift.bOffset, filters.channelShift.bAngle);

    const animatedNoiseSeedValues = useMemo(() => {
        return Array.from({length: 10}, () => Math.floor(Math.random() * 500)).join(';');
    }, []);
    
    const noiseBaseFrequency = useMemo(() => {
        const { type, scale } = filters.noise;
        // A larger scale value should result in a larger, less frequent noise pattern (lower baseFrequency).
        // The value is inverted to achieve this intuitive mapping.
        const baseFreqValue = 0.5 / (scale || 1); // Avoid division by zero
        if (type === 'grain') {
          // Grain needs a higher base frequency, so we add to a baseline.
          return 0.5 + baseFreqValue * 0.5;
        }
        return baseFreqValue;
    }, [filters.noise.type, filters.noise.scale]);

    const getSliceShiftDispMapMatrix = () => {
        if (filters.sliceShift.direction === 'horizontal') {
        return "1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 1 0";
        }
        // vertical
        return "0 0 0 0 0.5  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0";
    }

    const noiseTransferParams = useMemo(() => {
        const { blendMode, opacity } = filters.noise;
        switch (blendMode) {
        case 'screen':
        case 'difference':
            return { slope: opacity, intercept: 0 };
        case 'overlay':
            return { slope: opacity, intercept: 0.5 - opacity / 2 };
        default:
            return { slope: 1, intercept: 0 };
        }
    }, [filters.noise.blendMode, filters.noise.opacity]);

    return (
        <svg className="absolute w-0 h-0">
            <defs id="svg-filter-defs">
                {/* Channel Shift */}
                <filter id="channelShift" x="-50%" y="-50%" width="200%" height="200%">
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" in="SourceGraphic" result="r"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" in="SourceGraphic" result="g"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" in="SourceGraphic" result="b"/>
                    
                    <feOffset in="r" dx={rChan.dx} dy={rChan.dy} result="r_offset">
                        {filters.channelShift.animate && <>
                            <animate attributeName="dx" values={rAnim.dxValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                            <animate attributeName="dy" values={rAnim.dyValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                        </>}
                    </feOffset>
                    <feOffset in="g" dx={gChan.dx} dy={gChan.dy} result="g_offset">
                        {filters.channelShift.animate && <>
                            <animate attributeName="dx" values={gAnim.dxValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                            <animate attributeName="dy" values={gAnim.dyValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                        </>}
                    </feOffset>
                    <feOffset in="b" dx={bChan.dx} dy={bChan.dy} result="b_offset">
                        {filters.channelShift.animate && <>
                            <animate attributeName="dx" values={bAnim.dxValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                            <animate attributeName="dy" values={bAnim.dyValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                        </>}
                    </feOffset>
                    
                    <feBlend in="r_offset" in2="g_offset" mode="screen" result="rg_blend"/>
                    <feBlend in="rg_blend" in2="b_offset" mode="screen" result="final_blend"/>

                    <feComposite in="final_blend" in2="SourceGraphic" operator="in" />
                </filter>

                {/* Noise */}
                <filter id="noise" x="0" y="0" width="100%" height="100%">
                    <feTurbulence 
                        type={filters.noise.type === 'grain' ? 'fractalNoise' : filters.noise.type} 
                        baseFrequency={String(noiseBaseFrequency)}
                        numOctaves="3" 
                        stitchTiles="stitch" 
                        result="turbulence"
                    >
                        {filters.noise.animate && (
                            <animate attributeName="seed" values={animatedNoiseSeedValues} dur="0.2s" repeatCount="indefinite" />
                        )}
                    </feTurbulence>
                    <feColorMatrix in="turbulence" type="saturate" values="0" result="monochromeNoise"/>
                    <feComponentTransfer in="monochromeNoise" result="adjustedNoise">
                        <feFuncR type="linear" slope={noiseTransferParams.slope} intercept={noiseTransferParams.intercept} />
                        <feFuncG type="linear" slope={noiseTransferParams.slope} intercept={noiseTransferParams.intercept} />
                        <feFuncB type="linear" slope={noiseTransferParams.slope} intercept={noiseTransferParams.intercept} />
                    </feComponentTransfer>
                    <feBlend 
                        in="SourceGraphic" 
                        in2="adjustedNoise"
                        mode={filters.noise.blendMode} 
                        result="blendedNoise" />
                    <feComposite in="blendedNoise" in2="SourceGraphic" operator="in" />
                </filter>

                {/* Slit Scan (Wavy) */}
                <filter id="slitScan" x="-50%" y="-50%" width="200%" height="200%">
                    <feTurbulence type="fractalNoise" baseFrequency={filters.slitScan.direction === 'vertical' ? `0.001 ${filters.slitScan.density / 1000}` : `${filters.slitScan.density / 1000} 0.001`} numOctaves="3" seed="10" result="wavePattern" />
                    <feDisplacementMap in="SourceGraphic" in2="wavePattern" scale={filters.slitScan.amount} xChannelSelector="R" yChannelSelector="G" result="wavy">
                    {filters.slitScan.animate && <animate attributeName="scale" values={getSlitScanAnimationValues()} dur={`${2 / filters.slitScan.animationSpeed}s`} repeatCount="indefinite" />}
                    </feDisplacementMap>
                    <feComposite in="wavy" in2="SourceGraphic" operator="in" />
                </filter>
                
                {/* Pixelate */}
                <filter id="pixelate" x="0" y="0" width="100%" height="100%">
                    {filters.pixelate.type === 'crystal' ? (
                        <>
                            <feTurbulence type="fractalNoise" baseFrequency={0.02 + filters.pixelate.size * 0.005} numOctaves="1" result="voronoi_noise" />
                            <feComponentTransfer in="voronoi_noise" result="voronoi_map">
                                <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1.0" />
                                <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1.0" />
                            </feComponentTransfer>
                            <feDisplacementMap in="SourceGraphic" in2="voronoi_map" scale={filters.pixelate.size * 2} xChannelSelector="R" yChannelSelector="G" />
                        </>
                    ) : (
                        <>
                            <feFlood x="0" y="0" width="100%" height="100%" />
                            <feComposite width={filters.pixelate.size} height={filters.pixelate.size}>
                            {filters.pixelate.animate && <animate attributeName="width" values={getPixelateAnimationValues('width')} dur={`${2 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                            {filters.pixelate.animate && <animate attributeName="height" values={getPixelateAnimationValues('height')} dur={`${2 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                            </feComposite>
                            <feTile result="tiles" />
                            <feComposite in="SourceGraphic" in2="tiles" operator="in" result="pixelated" />
                            <feMorphology in="pixelated" operator="dilate" radius={filters.pixelate.size / 2} >
                                {filters.pixelate.animate && <animate attributeName="radius" values={getPixelateAnimationValues('radius')} dur={`${2 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                            </feMorphology>
                        </>
                    )}
                </filter>
                
                {/* Hue Rotate */}
                <filter id="hueRotate">
                    <feColorMatrix type="hueRotate" values={String(filters.hueRotate.angle)} />
                </filter>

                {/* Blur */}
                <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation={filters.blur.type === 'gaussian' ? `${filters.blur.amountX} ${filters.blur.amountY}` : getMotionBlurStdDeviation()}>
                    {filters.blur.animate && <animate attributeName="stdDeviation" values={getBlurAnimationValues()} dur={`${2 / filters.blur.animationSpeed}s`} repeatCount="indefinite" />}
                    </feGaussianBlur>
                </filter>
                
                {/* Color Controls */}
                <filter id="colorControls">
                    <feColorMatrix type="saturate" values={String(filters.colorControls.saturation)} />
                    <feComponentTransfer>
                        <feFuncR type="gamma" amplitude={filters.colorControls.contrast} exponent={1 / filters.colorControls.brightness} offset="0" />
                        <feFuncG type="gamma" amplitude={filters.colorControls.contrast} exponent={1 / filters.colorControls.brightness} offset="0" />
                        <feFuncB type="gamma" amplitude={filters.colorControls.contrast} exponent={1 / filters.colorControls.brightness} offset="0" />
                    </feComponentTransfer>
                </filter>

                {/* JPEG Glitch */}
                <filter id="jpegGlitch" x="-50%" y="-50%" width="200%" height="200%">
                    <feTurbulence type="fractalNoise" baseFrequency={`${filters.jpegGlitch.blockSize / 1000} ${filters.jpegGlitch.blockSize / 1000}`} numOctaves="1" result="blocks"/>
                    <feComponentTransfer in="blocks" result="sharpBlocks">
                        <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
                        <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
                    </feComponentTransfer>
                    <feDisplacementMap in="SourceGraphic" in2="sharpBlocks" scale={filters.jpegGlitch.amount} xChannelSelector="R" yChannelSelector="G" result="glitchPass1"/>
                    <feDisplacementMap in="glitchPass1" in2="sharpBlocks" scale={filters.jpegGlitch.amount / (filters.jpegGlitch.iterations > 1 ? 2 : 1)} xChannelSelector="B" yChannelSelector="G" result="glitchPass2"/>
                    <feDisplacementMap in="glitchPass2" in2="sharpBlocks" scale={filters.jpegGlitch.amount / (filters.jpegGlitch.iterations > 2 ? 4 : 1)} xChannelSelector="R" yChannelSelector="B" result="glitched" />
                    <feComposite in="glitched" in2="SourceGraphic" operator="in" />
                </filter>

                {/* Slice Shift */}
                <filter id="sliceShift" x="-50%" y="-50%" width="200%" height="200%">
                    <feTurbulence 
                        type="turbulence" 
                        baseFrequency={filters.sliceShift.direction === 'horizontal' ? `0.001 ${filters.sliceShift.sliceHeight / 200}` : `${filters.sliceShift.sliceHeight / 200} 0.001`} 
                        numOctaves="1" 
                        seed="0"
                        result="bands"
                    />
                    <feComponentTransfer in="bands" result="sharpBands">
                        <feFuncR type="discrete" tableValues="0 1" />
                        <feFuncG type="discrete" tableValues="0 1" />
                        <feFuncB type="discrete" tableValues="0 1" />
                    </feComponentTransfer>
                    <feColorMatrix in="sharpBands" type="matrix" values={getSliceShiftDispMapMatrix()} result="dispMap"/>
                    <feDisplacementMap 
                        in="SourceGraphic" 
                        in2="dispMap" 
                        scale={filters.sliceShift.offsetAmount} 
                        xChannelSelector="R"
                        yChannelSelector="G"
                        result="shifted"
                        edgeMode="duplicate"
                    >
                        {filters.sliceShift.animate && <animate attributeName="scale" values={getSliceShiftAnimationValues()} dur={`${2 / filters.sliceShift.animationSpeed}s`} repeatCount="indefinite" />}
                    </feDisplacementMap>
                    <feComposite in="SourceGraphic" in2="sharpBands" operator="out" result="unshifted"/>
                    <feComposite in="shifted" in2="sharpBands" operator="in" result="shiftedOnly"/>
                    <feMerge result="mergedSlices">
                        <feMergeNode in="unshifted"/>
                        <feMergeNode in="shiftedOnly"/>
                    </feMerge>
                    <feComposite in="mergedSlices" in2="SourceGraphic" operator="in" />
                </filter>

                {/* CRT Effect */}
                <filter id="crt" x="-20%" y="-20%" width="140%" height="140%">
                    {/* Barrel Distortion */}
                    <feTurbulence type="fractalNoise" baseFrequency="0.003" numOctaves="1" seed="1" result="distort_map" />
                    <feDisplacementMap in="SourceGraphic" in2="distort_map" scale={filters.crt.barrelDistortion} xChannelSelector="R" yChannelSelector="G" result="distorted_image" />

                    {/* --- Banding Effect --- */}
                    {/* Base texture for the fuzzy bands */}
                    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.1" numOctaves="2" seed="5" result="static_bands" />
                    {/* Animated vertical noise to make the bands drift/roll */}
                    <feTurbulence type="fractalNoise" baseFrequency="0 0.05" numOctaves="2" seed="10" result="scrolling_map">
                        {filters.crt.animate && (
                            <animate attributeName="seed" from="10" to="110" dur={`${4 / filters.crt.animationSpeed}s`} repeatCount="indefinite" />
                        )}
                    </feTurbulence>
                    {/* Displace the static texture with the animated noise */}
                    <feDisplacementMap in="static_bands" in2="scrolling_map" scale={filters.crt.bandingDrift} xChannelSelector="R" yChannelSelector="G" result="scrolling_bands" />
                    
                    {/* --- Banding MASK --- */}
                    {/* Generate vertical noise to define the bands' positions */}
                    <feTurbulence type="turbulence" baseFrequency={`0 ${filters.crt.bandingDensity / 1000}`} numOctaves="1" seed="20" result="banding_mask_noise" />
                    {/* Sharpen the noise into distinct bands using a high-contrast transfer */}
                    <feComponentTransfer in="banding_mask_noise" result="banding_mask">
                        <feFuncR type="linear" slope={filters.crt.bandingSharpness} intercept={0.5 - filters.crt.bandingSharpness / 2} />
                        <feFuncG type="linear" slope={filters.crt.bandingSharpness} intercept={0.5 - filters.crt.bandingSharpness / 2} />
                        <feFuncB type="linear" slope={filters.crt.bandingSharpness} intercept={0.5 - filters.crt.bandingSharpness / 2} />
                    </feComponentTransfer>
                    
                    {/* Apply the mask to the scrolling bands effect */}
                    <feComposite in="scrolling_bands" in2="banding_mask" operator="in" result="masked_scrolling_bands" />

                    {/* Blend the final masked bands with the distorted image */}
                    <feComponentTransfer in="masked_scrolling_bands" result="banding_alpha">
                        <feFuncA type="linear" slope={filters.crt.bandingOpacity} />
                    </feComponentTransfer>
                    <feBlend in="distorted_image" in2="banding_alpha" mode="screen" result="image_with_bands" />

                    {/* Scanlines */}
                    <feTurbulence type="fractalNoise" baseFrequency="0 3.5" numOctaves="1" result="scanlines_noise" />
                    <feComponentTransfer in="scanlines_noise" result="scanlines_alpha">
                        <feFuncA type="linear" slope={filters.crt.scanlineOpacity} />
                    </feComponentTransfer>
                    <feBlend in="image_with_bands" in2="scanlines_alpha" mode="multiply" result="image_with_scanlines" />
                    
                    {/* Vignette */}
                    <feMorphology in="SourceAlpha" operator="erode" radius={filters.crt.vignetteOpacity * 20} result="eroded_alpha" />
                    <feGaussianBlur in="eroded_alpha" stdDeviation={filters.crt.vignetteOpacity * 30} result="vignette_mask" />
                    <feComposite in="image_with_scanlines" in2="vignette_mask" operator="in" result="center_image" />
                    <feFlood flood-color="black" result="black"/>
                    <feComposite in="black" in2="vignette_mask" operator="out" result="vignette_edges" />
                    <feMerge>
                        <feMergeNode in="vignette_edges" />
                        <feMergeNode in="center_image" />
                    </feMerge>
                </filter>
                
                {/* Image Effects */}
                <filter id="imageEffects">
                    {filters.imageEffects.type === 'grayscale' ? (
                        <feColorMatrix type="saturate" values="0" result="effect"/>
                    ) : (
                        <feColorMatrix type="matrix" values={getImageEffectsMatrix()} result="effect"/>
                    )}
                    <feComposite in="SourceGraphic" in2="effect" operator="arithmetic"
                    k1="0" 
                    k2={1 - (filters.imageEffects.strength / 100)} 
                    k3={filters.imageEffects.strength / 100} 
                    k4="0" 
                    />
                </filter>

            </defs>
        </svg>
    )
}

export default SvgFilters;