export const NAV_LINKS = [
  {
    label: "Women",
    href: "/women",
    gender: "women",
    categories: [
      {
        label: "Sarees",
        href: "/women/sarees",
        children: [
          { label: "Cotton Sarees",    href: "/women/sarees/cotton-sarees" },
          { label: "Silk Sarees",      href: "/women/sarees/silk-sarees" },
          { label: "Kanjivaram",       href: "/women/sarees/kanjivaram" },
          { label: "Chiffon Sarees",   href: "/women/sarees/chiffon-sarees" },
          { label: "Georgette Sarees", href: "/women/sarees/georgette-sarees" },
          { label: "Dolo Silk",        href: "/women/sarees/dolo-silk" },
        ],
      },
      {
        label: "Kurtis",
        href: "/women/kurtis",
        children: [
          { label: "Printed Kurtis",    href: "/women/kurtis/printed" },
          { label: "Embroidered Kurtis",href: "/women/kurtis/embroidered" },
          { label: "Plain Kurtis",      href: "/women/kurtis/plain" },
        ],
      },
      { label: "Chudidars",  href: "/women/chudidars",  children: [] },
      { label: "Leggings",   href: "/women/leggings",   children: [] },
      { label: "Dupattas",   href: "/women/dupattas",   children: [] },
      { label: "Nightwear",  href: "/women/nightwear",  children: [] },
    ],
  },
  {
    label: "Kids",
    href: "/kids",
    gender: "kids",
    categories: [
      {
        label: "Boys",
        href: "/kids/boys",
        children: [
          { label: "Shirts",         href: "/kids/boys/shirts" },
          { label: "Pants & Shorts", href: "/kids/boys/pants-shorts" },
          { label: "Sets",           href: "/kids/boys/sets" },
        ],
      },
      {
        label: "Girls",
        href: "/kids/girls",
        children: [
          { label: "Frocks & Dresses", href: "/kids/girls/frocks" },
          { label: "Churidars",        href: "/kids/girls/churidars" },
          { label: "Sets",             href: "/kids/girls/sets" },
        ],
      },
    ],
  },
  {
    label: "Accessories",
    href: "/accessories",
    gender: "accessories",
    categories: [
      { label: "Umbrellas", href: "/accessories/umbrellas", children: [] },
      { label: "Purses",    href: "/accessories/purses",    children: [] },
      { label: "Handbags",  href: "/accessories/handbags",  children: [] },
    ],
  },
] as const;