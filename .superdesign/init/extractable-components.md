# Extractable components

## SiteNav
- Source: `components/SiteNav.tsx` (+ `components/PrimaryNav.tsx`)
- Category: layout
- Description: Top navigation with logo, links and PT/EN switch
- Extractable props: activeItem (string, default: "cases")
- Hardcoded: logo, labels, CSS

## Footer
- Source: `components/Footer.tsx`
- Category: layout
- Description: Site footer with contact call and links

## CaseShell
- Source: `components/case/CaseShell.tsx`
- Category: layout
- Description: Case page frame: hero slot, section nav, document, next-case link

## Button
- Source: `components/ui/Button.tsx`
- Category: basic
- Description: Pill buttons
- Extractable props: variant

## CaseTag
- Source: `components/ui/CaseTag.tsx`
- Category: basic
- Description: Small rounded tag for case metadata

## Eyebrow
- Source: `components/ui/Eyebrow.tsx`
- Category: basic
- Description: Uppercase small label above headings

## CaseReel
- Source: `components/reel/CaseReel.tsx`
- Category: basic
- Description: Case video entry: eyebrow, cover with play button; opens ReelPlayer
