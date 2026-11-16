import styles from './footer-bug-chase.module.css';
import {FooterAnimationJoint as Joint} from './footer-animation-joint';

/** Decorative SVG fragment; the enclosing scene supplies its accessibility boundary. */
export function CodingBug(){
  return <g stroke="#3d204f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="445" cy="236" rx="29" ry="2.5" fill="#100c28" opacity=".16" stroke="none"/>
    <Joint x={444} y={216} className={styles.bugHop}>
    <g fill="none" stroke="#c66586" strokeWidth="3.5">
      <Joint x={432} y={204} className={styles.bugLegRearLeft}>
        <path d="M432 204 420 210 415 220"/>
        <path d="m414 221 5 1" strokeWidth="2.5"/>
      </Joint>
      <Joint x={433} y={214} className={styles.bugLegRearRight}>
        <path d="m433 214-11 10 4 9"/>
        <path d="m424 234 6 1" strokeWidth="2.5"/>
      </Joint>
      <Joint x={446} y={213} className={styles.bugLegMid}>
        <path d="m441 219-7 9 5 7"/>
        <path d="m437 236 7-1" strokeWidth="2.5"/>
        <path d="m454 206 14 6 9 10"/>
        <path d="m476 223 5-1" strokeWidth="2.5"/>
      </Joint>
      <Joint x={455} y={215} className={styles.bugLegFront}>
        <path d="m451 218 6 10 12 5"/>
        <path d="m468 234 6-2" strokeWidth="2.5"/>
        <path d="m459 212 12 9 3 10"/>
        <path d="m472 232 7-1" strokeWidth="2.5"/>
      </Joint>
    </g>

    <Joint x={444} y={212} className={styles.bugBody}>
      <path d="M423 211c0-12 9-20 21-20 13 0 23 9 23 20s-10 18-23 18c-12 0-21-6-21-18Z" fill="#f36476"/>
      <path d="M425 217c5 5 11 7 19 7 10 0 18-5 21-11-1 10-10 16-21 16-10 0-17-4-19-12Z" fill="#d94466" stroke="none"/>
      <path d="M445 193c-4 9-4 22 2 34" fill="none" stroke="#c8395d" strokeWidth="1.7"/>
      <ellipse cx="434" cy="201" rx="6.5" ry="3" fill="#ffc0b4" opacity=".65" stroke="none" transform="rotate(-24 434 201)"/>
      <g fill="none" stroke="#ffe5dc" strokeWidth="1.7">
        <path d="M438 202c-5 0-1 5-6 8 5 2 1 8 6 8"/>
        <path d="M445 202c5 0 1 5 6 8-5 2-1 8-6 8"/>
      </g>

      <Joint x={465} y={200} className={styles.bugHead}>
        <g fill="none" stroke="#f58c9b" strokeWidth="2.3">
          <path d="M458 191c-7-4-5-9-8-12"/>
          <path d="M470 190c0-8 7-7 8-12"/>
        </g>
        <circle cx="449.5" cy="177.5" r="2.5" fill="#96e4f2" strokeWidth="1.5"/>
        <circle cx="479" cy="176.5" r="2.5" fill="#96e4f2" strokeWidth="1.5"/>
        <path d="M451 200c0-8 5-14 13-14 9 0 15 6 15 14 0 9-5 15-14 15-8 0-14-6-14-15Z" fill="#ff8290"/>
        <ellipse cx="460.5" cy="196.5" rx="5.5" ry="6.5" fill="#fff9f0" strokeWidth="1.5"/>
        <ellipse cx="472.5" cy="195.5" rx="5" ry="6" fill="#fff9f0" strokeWidth="1.5"/>
        <g className={styles.bugPupils} stroke="none">
          <ellipse cx="463" cy="197" rx="2.6" ry="3.6" fill="#392344"/>
          <ellipse cx="475" cy="196" rx="2.5" ry="3.4" fill="#392344"/>
          <circle cx="464" cy="195.8" r=".9" fill="#fff"/>
          <circle cx="476" cy="194.8" r=".8" fill="#fff"/>
        </g>
        <path d="m455 187 6-2m8-1 6 1" fill="none" strokeWidth="1.7"/>
        <path d="M462 205q7 8 13-2" fill="#86334f" strokeWidth="1.5"/>
        <path d="m465 207 5 1" fill="none" stroke="#ffb3bc" strokeWidth="2"/>
        <ellipse cx="456.5" cy="205" rx="2.5" ry="1.5" fill="#ee536f" opacity=".65" stroke="none"/>
      </Joint>
    </Joint>
    </Joint>
  </g>;
}
