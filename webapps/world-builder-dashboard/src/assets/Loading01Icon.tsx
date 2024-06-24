import React from "react";

const Loading01Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
            d="M12 2.25V4.75M12 18V22M5.75 12H2.25M21.25 12H19.75M18.4571 18.4571L17.75 17.75M18.6642 5.41579L17.25 6.83M4.92157 19.0784L7.75 16.25M5.12868 5.20868L7.25 7.33"
            stroke={props.color ?? "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export default Loading01Icon;