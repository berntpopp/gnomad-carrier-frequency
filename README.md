# gnomAD Carrier Frequency Calculator

![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?logo=vuedotjs&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)
![Vuetify](https://img.shields.io/badge/Vuetify-1867C0?logo=vuetify&logoColor=fff)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A web-based tool for genetic counselors to calculate carrier frequencies for autosomal recessive conditions using population allele frequency data from the Genome Aggregation Database (gnomAD).

**Live Demo:** [https://berntpopp.github.io/gnomad-carrier-frequency/](https://berntpopp.github.io/gnomad-carrier-frequency/)

## Features

- **Direct gnomAD Queries** - Queries gnomAD GraphQL API directly from the browser
- **Population-Specific Frequencies** - Calculate carrier frequencies for multiple populations
- **Configurable Filters** - Toggle LoF HC, missense, and ClinVar pathogenicity filters
- **Variant Details** - View contributing variants with HGVS nomenclature and allele frequencies
- **ClinGen Validation** - Automatic gene-disease validity checking against ClinGen curations
- **Gene Constraint Scores** - Display pLI and LOEUF constraint metrics
- **Clinical Text Generation** - Generate German clinical documentation text for patient letters
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

1. **Select gnomAD Version** - Choose between v4.1 (GRCh38) or v2.1.1 (GRCh37)
2. **Search for Gene** - Enter a gene symbol (e.g., CFTR, SMN1, HBB)
3. **Review Validation** - Check ClinGen AR association and gene constraint scores
4. **Select Population** - Choose the population matching patient ancestry
5. **Configure Filters** - Adjust variant filters if needed
6. **View Results** - See carrier frequency, affected frequency, and contributing variants
7. **Generate Text** - Copy clinical text for documentation

## Data Sources

| Source | Description | Version |
|--------|-------------|---------|
| [gnomAD](https://gnomad.broadinstitute.org/) | Population allele frequencies | v4.1 / v2.1.1 |
| [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) | Variant pathogenicity classifications | via gnomAD |
| [ClinGen](https://clinicalgenome.org/) | Gene-disease validity curations | Live (30-day cache) |

## Methodology

Carrier frequency is calculated using the Hardy-Weinberg equilibrium principle:

- **q** = Sum of pathogenic variant allele frequencies
- **Carrier frequency** = 2q (heterozygote frequency)
- **Affected frequency** = q^2 (homozygote frequency)

For detailed methodology, see the Methodology section in the app.

## Technology Stack

- **Framework:** Vue 3 with Composition API
- **UI Library:** Vuetify 3 (Material Design)
- **Build Tool:** Vite 7
- **Language:** TypeScript 5
- **State Management:** Pinia with persistence
- **GraphQL Client:** Villus
- **Deployment:** GitHub Pages

## Development

```bash
# Run linting
bun run lint
# or: npm run lint

# Run type checking
bun run typecheck
# or: npm run typecheck

# Run build with type checking
bun run build
# or: npm run build
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
```

## Disclaimer

**For Research Use Only**

This tool provides carrier frequency estimates based on gnomAD population data. Results are intended for research and educational purposes.

- Results should be verified by a clinical laboratory before use in patient care
- This tool does not replace genetic counseling or clinical judgment
- Population frequencies may not reflect specific patient ancestry

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
