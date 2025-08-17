# Contributing to RiverBit Trading Platform

Thank you for your interest in contributing to RiverBit! This document provides guidelines for contributing to our project.

## 🎯 How to Contribute

### 🐛 Reporting Bugs
- Use GitHub Issues to report bugs
- Include detailed reproduction steps
- Provide system information (OS, browser, Node.js version)
- Include screenshots for UI issues

### 💡 Suggesting Features
- Use GitHub Issues with the "enhancement" label
- Clearly describe the feature and its benefits
- Include mockups or examples when possible

### 🔀 Pull Requests

#### Before Submitting
1. **Check existing issues** to avoid duplicate work
2. **Fork the repository** and create a feature branch
3. **Follow our coding standards** (see below)
4. **Write tests** for new functionality
5. **Update documentation** as needed

#### Process
1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📋 Development Setup

### Prerequisites
- Node.js 18+
- pnpm (recommended)
- Git

### Local Development
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/xxxdemo.git
cd xxxdemo

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## 🔧 Coding Standards

### TypeScript
- Use strict TypeScript configuration
- Define proper interfaces for all data structures
- Avoid `any` types - use proper typing
- Use meaningful variable and function names

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices for performance
- Use memo, useMemo, and useCallback appropriately

### Styling
- Use Tailwind CSS utility classes
- Follow the established design system
- Maintain responsive design principles
- Use semantic CSS class names

### Git Commits
We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new trading strategy generator
fix: resolve price calculation bug
docs: update API documentation
style: format code according to prettier
refactor: restructure trading engine
test: add unit tests for risk manager
chore: update dependencies
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test
pnpm test TradingForm
```

### Test Guidelines
- Write unit tests for utilities and business logic
- Write integration tests for component interactions
- Write E2E tests for critical user flows
- Maintain test coverage above 80%

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── trading/        # Trading-specific components
│   ├── ai/             # AI-related components
│   └── pages/          # Page-level components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── styles/             # CSS and styling
└── constants/          # Application constants
```

## 🎨 Design Guidelines

### UI/UX Principles
- **Professional**: Maintain enterprise-grade visual quality
- **Accessible**: Follow WCAG 2.1 AA guidelines
- **Responsive**: Mobile-first design approach
- **Performance**: Optimize for 60fps animations

### Color System
- Use the established RiverBit color palette
- Maintain consistent contrast ratios
- Follow the glassmorphism design patterns
- Use semantic color naming

## 🚀 Deployment

### Preview Deployments
- All PRs automatically generate preview deployments
- Test your changes in the preview environment
- Ensure all features work as expected

### Production Deployment
- Only maintainers can deploy to production
- All deployments require passing CI/CD checks
- Include deployment notes in your PR

## 📞 Getting Help

### Community
- **GitHub Discussions**: For general questions and ideas
- **Discord**: Real-time chat with the community
- **GitHub Issues**: For bug reports and feature requests

### Maintainers
- **Victor**: Lead Developer
- **Team**: Core contributors

## 📋 Code of Conduct

We are committed to providing a welcoming and inspiring community for all:

- **Be respectful** and inclusive
- **Be constructive** in feedback
- **Be collaborative** and helpful
- **Be professional** in all interactions

## 🎉 Recognition

Contributors will be recognized in:
- Project README
- Release notes
- Hall of Fame section

Thank you for helping make RiverBit better! 🌊⚡