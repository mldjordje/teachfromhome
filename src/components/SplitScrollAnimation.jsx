import { useEffect } from "react";
import 'splitting/dist/splitting.css'
import 'splitting/dist/splitting-cells.css'
import Splitting from 'splitting'
import ScrollOut from 'scroll-out'
import { wordsWrap, overlayAnim } from "@common/utilits";

const SplitScrollAnimation = () => {
	useEffect(() => {
        setTimeout(function(){
            Splitting({ by: 'lines' });
            ScrollOut({targets: '[data-onovo-scroll]', once: true});
        
            wordsWrap();
            overlayAnim();
        }, 500);
	}, []);

    return (
        <>
            {/* Split & Scroll */}
            <div className="split-scroll-container" />
        </>
    );
};

export default SplitScrollAnimation;