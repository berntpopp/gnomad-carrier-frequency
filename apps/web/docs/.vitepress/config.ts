import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'gnomAD Carrier Frequency Docs',
  description: 'Calculate carrier frequencies for autosomal recessive conditions from gnomAD data',
  base: '/docs/',

  appearance: true, // Dark mode follows system preference

  lastUpdated: true,

  sitemap: {
    // Must include /docs/ base path (VitePress does not auto-append base to hostname)
    hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org/docs/',
  },

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { property: 'og:image', content: 'https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png' }],
  ],

  themeConfig: {
    // Navigation
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Use Cases', link: '/use-cases/' },
      { text: 'Concepts', link: '/concepts/what-is-carrier-frequency' },
      { text: 'Reference', link: '/reference/' },
      { text: 'About', link: '/about/' },
      { text: 'Open Calculator', link: 'https://gnomad-carrier-frequency.kidney-genetics.org/', target: '_blank' }
    ],

    // Sidebar configuration
    sidebar: {
      '/concepts/': [
        {
          text: 'Concepts',
          items: [
            { text: 'What is Carrier Frequency?', link: '/concepts/what-is-carrier-frequency' },
            { text: 'How to Calculate', link: '/concepts/how-to-calculate' }
          ]
        }
      ],
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Contributing Gene Configs', link: '/guide/contributing-gene-configs' }
          ]
        }
      ],
      '/use-cases/': [
        {
          text: 'Use Cases',
          items: [
            { text: 'Overview', link: '/use-cases/' },
            { text: 'Carrier Screening', link: '/use-cases/carrier-screening' },
            { text: 'Text Generation', link: '/use-cases/clinical-letter' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Overview', link: '/reference/' },
            { text: 'Methodology', link: '/reference/methodology' },
            { text: 'Data Sources', link: '/reference/data-sources' },
            { text: 'Filters', link: '/reference/filters' },
            { text: 'Templates', link: '/reference/templates' },
            { text: 'FAQ', link: '/reference/faq' }
          ]
        }
      ],
      '/about/': [
        {
          text: 'About',
          items: [
            { text: 'Overview', link: '/about/' },
            { text: 'Citation', link: '/about/citation' },
            { text: 'Changelog', link: '/about/changelog' },
            { text: 'Contributing', link: '/about/contributing' }
          ]
        }
      ]
    },

    // Search
    search: {
      provider: 'local'
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/berntpopp/gnomad-carrier-frequency' }
    ]
  }
})
