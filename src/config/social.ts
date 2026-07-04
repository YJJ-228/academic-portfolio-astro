import type { SocialLink } from "../types";

export const SOCIALS: SocialLink[] = [
    {
        name: "Github",
        href: "https://github.com/YJJ-228",
        linkTitle: `Follow Jiongjie on Github`,
        isActive: true,
    },
    {
        name: "Mail",
        href: "mailto:yjj751110@gmail.com",
        linkTitle: `Send an email to Jiongjie`,
        isActive: true,
    },
    // {
    //     name: "Google Scholar",
    //     href: "https://scholar.google.com/citations?user=shannon",
    //     linkTitle: `Jiongjie Ye on Google Scholar`,
    //     isActive: true,
    // },
    {
        name: "ORCID",
        href: "https://orcid.org/0009-0008-8765-2779",
        linkTitle: `Jiongjie on ORCID`,
        isActive: true,
    },
];

export const SOCIAL_ICONS: Record<string, string> = {
    Github: "Github",
    Mail: "Mail",
    // "Google Scholar": "GoogleScholar",
    ORCID: "ORCID",
    RSS: "RSS",
};