# gnomAD Carrier Frequency Calculator

![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?logo=vuedotjs&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)
![Vuetify](https://img.shields.io/badge/Vuetify-1867C0?logo=vuetify&logoColor=fff)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

[![Live App](https://img.shields.io/badge/Live_App-gnomad--carrier--frequency-blue?logo=googlechrome&logoColor=white)](https://gnomad-carrier-frequency.kidney-genetics.org/)
[![Documentation](https://img.shields.io/badge/Docs-VitePress-747bff?logo=vitepress&logoColor=white)](https://gnomad-carrier-frequency.kidney-genetics.org/docs/)

A research tool for exploring carrier frequencies for autosomal recessive conditions using population allele frequency data from the Genome Aggregation Database (gnomAD).

> **For Research Use Only** - This tool is intended for research and educational purposes. It is not a validated clinical diagnostic tool. Any outputs must be independently reviewed and verified by qualified professionals before use in a clinical context.

## Features

- **Direct gnomAD Queries** - Queries gnomAD GraphQL API directly from the browser
- **Population-Specific Frequencies** - Calculate carrier frequencies for multiple populations
- **Configurable Filters** - Toggle LoF HC, missense, and ClinVar pathogenicity filters
- **Variant Details** - View contributing variants with HGVS nomenclature and allele frequencies
- **ClinGen Validation** - Automatic gene-disease validity checking against ClinGen curations
- **Gene Constraint Scores** - Display pLI and LOEUF constraint metrics
- **Text Generation** - Generate German and English documentation text from customizable templates
- **Dark/Light Theme** - Automatic theme detection with manual override

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) runtime
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/berntpopp/gnomad-carrier-frequency.git
cd gnomad-carrier-frequency

# Install dependencies
bun install
# or: npm install

# Start development server
bun run dev
# or: npm run dev
```

The app will be available at `http://localhost:5173/gnomad-carrier-frequency/`

### Build for Production

```bash
bun run build
# or: npm run build

# Preview production build
bun run preview
```

## Usage

1. **Select gnomAD Version** - Choose between v4.1 (GRCh38), v3.1.2 (GRCh38), or v2.1.1 (GRCh37)
2. **Search for Gene** - Enter a gene symbol (e.g., CFTR, SMN1, HBB)
3. **Review Validation** - Check ClinGen AR association and gene constraint scores
4. **Select Population** - Choose the population matching the ancestry of interest
5. **Configure Filters** - Adjust variant filters if needed
6. **View Results** - See carrier frequency, affected frequency, and contributing variants
7. **Generate Text** - Copy generated text for documentation purposes

## Data Sources

| Source | Description | Version |
|--------|-------------|---------|
| [gnomAD](https://gnomad.broadinstitute.org/) | Population allele frequencies | v4.1 / v3.1.2 / v2.1.1 |
| [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) | Variant pathogenicity classifications | via gnomAD |
| [ClinGen](https://clinicalgenome.org/) | Gene-disease validity curations | Live (30-day cache) |

## Methodology

Carrier frequency is calculated using the Hardy-Weinberg equilibrium principle:

- **q** = Sum of pathogenic variant allele frequencies
- **Carrier frequency** = 2q (heterozygote frequency)
- **Affected frequency** = q^2 (homozygote frequency)

For detailed methodology, see the [Methodology documentation](https://gnomad-carrier-frequency.kidney-genetics.org/docs/reference/methodology).

## Technology Stack

- **Framework:** Vue 3 with Composition API
- **UI Library:** Vuetify 3 (Material Design)
- **Build Tool:** Vite 7
- **Language:** TypeScript 5
- **State Management:** Pinia with persistence
- **GraphQL Client:** Villus
- **Documentation:** VitePress
- **Deployment:** GitHub Pages

## Development

```bash
# Run linting
bun run lint

# Run type checking
bun run typecheck

# Run build with type checking
bun run build

# Run documentation dev server
bun run docs:dev
```

### Project Structure

```
src/
├── api/              # gnomAD GraphQL client and queries
├── components/       # Vue components
│   └── wizard/       # 4-step wizard flow
├── composables/      # Vue composables (use* pattern)
├── config/           # Configuration files and templates
├── stores/           # Pinia stores
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
docs/                 # VitePress documentation site
```

## Disclaimer

**For Research Use Only**

This tool provides carrier frequency estimates based on gnomAD population data. Results are intended for research and educational purposes only.

- This tool is not a validated clinical diagnostic tool
- Any outputs must be independently reviewed and verified by qualified professionals
- Population frequencies may not reflect specific individual ancestry
- This tool does not replace professional judgment or laboratory testing

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Bernt Popp**

- GitHub: [@berntpopp](https://github.com/berntpopp)

## Acknowledgments

- [Genome Aggregation Database (gnomAD)](https://gnomad.broadinstitute.org/) team at the Broad Institute
- [ClinGen](https://clinicalgenome.org/) consortium
- [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) at NCBI

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
