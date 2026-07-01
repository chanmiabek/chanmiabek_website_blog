import { About, Blog, Gallery, Home, Newsletter, Person, Social, Work } from "@/types";
import { Line, Row, Text } from "@once-ui-system/core";
import galleryImages from "./gallery-images.json";

const person: Person = {
  firstName: "Chan",
  lastName: "Miabek",
  name: "Chan Miabek",
  role: "Software Developer",
  avatar: "/images/chan-profile.jpg",
  email: "chanmiabek22@gmail.com",
  location: "Africa/Nairobi",
  languages: ["English", "Dinka"],
  locale: "en",
};

const newsletter: Newsletter = {
  display: false,
  title: <>Subscribe to {person.firstName}'s Newsletter</>,
  description: <>Updates on software projects, learning notes, and engineering ideas.</>,
};

const social: Social = [
  {
    name: "GitHub",
    icon: "github",
    link: "https://github.com/chanmiabek/",
    essential: true,
  },
  {
    name: "LinkedIn",
    icon: "linkedin",
    link: "https://www.linkedin.com/chanmiabek/",
    essential: true,
  },
  {
    name: "Instagram",
    icon: "instagram",
    link: "https://www.instagram.com/maggisojaks/",
    essential: false,
  },
  {
    name: "Threads",
    icon: "threads",
    link: "https://www.threads.com/@maggiso_jak/",
    essential: true,
  },
  {
    name: "Email",
    icon: "email",
    link: `mailto:${person.email}`,
    essential: true,
  },
];

const home: Home = {
  path: "/",
  image: "/images/digital.jpg",
  label: "Home",
  title: `${person.name}'s Portfolio`,
  description: `Portfolio website showcasing my work as a ${person.role}`,
  headline: <>Software developer building practical digital experiences</>,
  featured: {
    display: true,
    title: (
      <Row gap="12" vertical="center">
        <strong className="ml-4">Chan Miabek</strong>{" "}
        <Line background="brand-alpha-strong" vert height="20" />
        <Text marginRight="4" onBackground="brand-medium">
          Featured work
        </Text>
      </Row>
    ),
    href: "/work/simple-portfolio-builder",
  },
  subline: (
    <>
      I'm {person.firstName}, a {person.role.toLowerCase()} focused on building clean,
      responsive websites and useful applications for real people.
    </>
  ),
};

const about: About = {
  path: "/about",
  label: "About",
  title: `About - ${person.name}`,
  description: `Meet ${person.name}, ${person.role} from ${person.location}`,
  tableOfContent: {
    display: true,
    subItems: false,
  },
  avatar: {
    display: true,
  },
  calendar: {
    display: true,
    link: `mailto:${person.email}`,
  },
  intro: {
    display: true,
    title: "Introduction",
    description: (
      <>
        {person.firstName} is a Nairobi-based {person.role.toLowerCase()} who turns ideas into
        fast, usable, and maintainable digital products. He enjoys building responsive interfaces,
        solving practical problems with code, and learning the tools that make software more
        reliable.
      </>
    ),
  },
  work: {
    display: true,
    title: "Work Experience",
    experiences: [
      {
        company: "Independent Projects",
        timeframe: "2023 - Present",
        role: "Software Developer",
        achievements: [
          <>
            Built portfolio, landing page, and web application interfaces with React, Next.js, and
            modern CSS practices.
          </>,
          <>
            Focused on readable code, responsive layouts, and clear user flows from the first screen
            through final deployment.
          </>,
        ],
        images: [
          {
            src: "/images/mywork.jpg",
            alt: "Portfolio project on a laptop",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        company: "Learning and Practice",
        timeframe: "2021 - 2023",
        role: "Frontend Developer",
        achievements: [
          <>
            Practiced software engineering fundamentals through hands-on web projects, reusable
            components, and structured content systems.
          </>,
          <>
            Improved skills across JavaScript, TypeScript, React, Git, and deployment workflows.
          </>,
        ],
        images: [],
      },
    ],
  },
  studies: {
    display: true,
    title: "Studies",
    institutions: [
      {
        name: "Software Engineering",
        description: <>Studied programming, web development, and software project workflows.</>,
      },
      {
        name: "Self-directed Learning",
        description: <>Continues learning through projects, documentation, and practical builds.</>,
      },
    ],
  },
  technical: {
    display: true,
    title: "Technical skills",
    skills: [
      {
        title: "Frontend Development",
        description: (
          <>Building responsive interfaces with React, Next.js, TypeScript, HTML, and CSS.</>
        ),
        tags: [
          {
            name: "React",
            icon: "react",
          },
          {
            name: "Next.js",
            icon: "nextjs",
          },
          {
            name: "TypeScript",
            icon: "typescript",
          },
        ],
        images: [
          {
            src: "/images/react.png",
            alt: "React JS",
            width: 16,
            height: 9,
          },
          {
            src: "/images/html.png",
            alt: "HTML",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        title: "Product Implementation",
        description: (
          <>Turning requirements into usable screens, project pages, and deployable applications.</>
        ),
        tags: [
          {
            name: "JavaScript",
            icon: "javascript",
          },
          {
            name: "Git",
            icon: "github",
          },
          {
            name: "Figma",
            icon: "figma",
          },
        ],
        images: [
          {
            src: "/images/novatech.png",
            alt: "Nova Tech project",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
};

const blog: Blog = {
  path: "/blog",
  label: "Blog",
  title: "Writing about software and learning",
  description: `Read what ${person.name} has been up to recently`,
};

const work: Work = {
  path: "/work",
  label: "Work",
  title: `Projects - ${person.name}`,
  description: `Design and development projects by ${person.name}`,
};

const gallery: Gallery = {
  path: "/gallery",
  label: "Gallery",
  title: `Photo gallery - ${person.name}`,
  description: `A photo collection by ${person.name}`,
  images: galleryImages,
};

export { person, social, newsletter, home, about, blog, work, gallery };
