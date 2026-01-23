import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
});

let mermaidId = 0;

interface MermaidBlockProps {
    code: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
    const [svg, setSvg] = useState('');
    const id = useRef(`mermaid-${mermaidId++}`).current;

    useEffect(() => {
        mermaid.render(id, code).then(result => {
            setSvg(result.svg);
        }).catch(err => {
            console.error('Mermaid render error:', err);
            setSvg(`<div style="color:red">Mermaid Error: ${err.message}</div>`);
        });
    }, [code, id]);

    return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};
