import type {ComponentPropsWithoutRef} from 'react';

type Props=Omit<ComponentPropsWithoutRef<'g'>,'transform'|'x'|'y'>&{x:number;y:number};

/** Keep CSS rotation/scale at zero; SVG translations establish the joint pivot. */
export function FooterAnimationJoint({x,y,children,...props}:Props){
  return <g transform={`translate(${x} ${y})`}>
    <g {...props}><g transform={`translate(${-x} ${-y})`}>{children}</g></g>
  </g>;
}
