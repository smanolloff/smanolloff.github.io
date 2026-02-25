// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "About",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-projects",
          title: "Projects",
          description: "Passion-driven projects that have kept me up through many sleepless nights.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-repositories",
          title: "Repositories",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "projects-bass-preamp",
          title: 'bass-preamp',
          description: "A 10-band guitar/bass guitar equalizer",
          section: "Projects",handler: () => {
              window.location.href = "/projects/bass-preamp/";
            },},{id: "projects-dom-o-fone",
          title: 'dom-o-fone',
          description: "A device for remotely opening doors via the GSM network",
          section: "Projects",handler: () => {
              window.location.href = "/projects/dom-o-fone/";
            },},{id: "projects-mic-mixer",
          title: 'mic-mixer',
          description: "A device for mixing microphone signals",
          section: "Projects",handler: () => {
              window.location.href = "/projects/mic-mixer/";
            },},{id: "projects-mini-mixer",
          title: 'mini-mixer',
          description: "A pocket mixer for a guitar and line input",
          section: "Projects",handler: () => {
              window.location.href = "/projects/mini-mixer/";
            },},{id: "projects-qwop-gym",
          title: 'qwop-gym',
          description: "An AI for Bennet Foddy&#39;s game called &quot;QWOP&quot;",
          section: "Projects",handler: () => {
              window.location.href = "/projects/qwop-gym/";
            },},{id: "projects-rs2lan",
          title: 'rs2lan',
          description: "A device emergency network access to remote sites",
          section: "Projects",handler: () => {
              window.location.href = "/projects/rs2lan/";
            },},{id: "projects-vcmi-gym",
          title: 'vcmi-gym',
          description: "An AI for the game of &quot;Heroes of Might and Magic III&quot;",
          section: "Projects",handler: () => {
              window.location.href = "/projects/vcmi-gym/";
            },},{
        id: 'social-cv',
        title: 'CV',
        section: 'Socials',
        handler: () => {
          window.open("/assets/pdf/cv.pdf", "_blank");
        },
      },{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%73.%6D%61%6E%6F%6C%6C%6F%66%66@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/smanolloff", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/simeon-manolov-08a21781", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
