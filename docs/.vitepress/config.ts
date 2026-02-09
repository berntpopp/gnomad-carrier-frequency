import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'gnomAD Carrier Frequency Docs',
  description: 'Calculate carrier frequencies for autosomal recessive conditions from gnomAD data',
  base: '/gnomad-carrier-frequency/docs/',

  appearance: true, // Dark mode follows system preference

  head: [
    ['link', { rel: 'icon', href: '/gnomad-carrier-frequency/favicon.svg' }]
  ],

  themeConfig: {
    // Navigation
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Use Cases', link: '/use-cases/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'About', link: '/about/' },
      { text: 'Open Calculator', link: '/gnomad-carrier-frequency/', target: '_blank' }
    ],

    // Sidebar configuration
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' }
          ]
        }
      ],
      '/use-cases/': [
        {
          text: 'Use Cases',
          items: [
            { text: 'Overview', link: '/use-cases/' },
            { text: 'Carrier Screening', link: '/use-cases/carrier-screening' },
            { text: 'Family Planning', link: '/use-cases/family-planning' },
            { text: 'Clinical Letter', link: '/use-cases/clinical-letter' }
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
            { text: 'Templates', link: '/reference/templates' }
          ]
        }
      ],
      '/about/': [
        {
          text: 'About',
          items: [
            { text: 'Overview', link: '/about/' },
            { text: 'Citation', link: '/about/citation' },
            { text: 'Changelog', link: '/about/changelog' }
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
