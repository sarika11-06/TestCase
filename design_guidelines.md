# Design Guidelines: AI Test Case Generator

## Design Approach

**Selected Approach**: Design System Hybrid (Linear + Material Design)
- **Primary Inspiration**: Linear's clean developer-focused aesthetic for overall layout and typography
- **Secondary Reference**: Material Design for form components and interactive elements
- **Rationale**: This developer productivity tool requires clarity, efficiency, and professional polish. Linear's minimalist approach paired with Material's robust component patterns creates an interface optimized for technical users who value function and speed.

## Core Design Principles

1. **Information Hierarchy**: Clear visual separation between input, processing, and output zones
2. **Technical Clarity**: Code-friendly typography and syntax highlighting for test cases
3. **Efficiency First**: Streamlined workflow with minimal clicks from input to result
4. **Professional Polish**: Clean, distraction-free interface that inspires confidence

---

## Typography System

**Font Families** (via Google Fonts CDN):
- **Primary**: Inter (400, 500, 600) - UI text, labels, descriptions
- **Monospace**: JetBrains Mono (400, 500) - Code blocks, URLs, test case output

**Hierarchy**:
- **Page Title**: text-2xl font-semibold (Inter)
- **Section Headers**: text-lg font-medium
- **Body/Labels**: text-sm font-medium
- **Helper Text**: text-xs text-gray-600
- **Code Display**: text-sm font-mono (JetBrains Mono)
- **Generated Output**: text-xs font-mono for test case code

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, and 8** consistently
- Micro spacing: p-2, gap-2 (8px)
- Standard spacing: p-4, gap-4, m-4 (16px)
- Section spacing: p-6, py-6 (24px)
- Major sections: p-8, py-8 (32px)

**Container Strategy**:
- Maximum width: max-w-6xl mx-auto
- Side padding: px-4 on mobile, px-6 on desktop
- Two-column split on desktop (lg:) where applicable

**Layout Structure**:
```
Header (fixed/sticky)
├─ Logo/Title (left)
└─ Action buttons (right)

Main Content Area (max-w-6xl)
├─ Input Section (full-width card)
│  ├─ URL input field
│  ├─ Prompt textarea
│  └─ Generate button + options
│
├─ Results Section (conditional visibility)
│  ├─ Status indicator
│  ├─ Test case count summary
│  └─ Test case display grid
│
└─ Generated Test Cases
   └─ Expandable code blocks with copy functionality
```

---

## Component Library

### 1. **Header/Navigation**
- Height: h-16
- Background: Subtle border-b
- Contains: Project title (left), API status indicator, settings icon (right)
- Layout: flex items-center justify-between px-6

### 2. **Input Card Container**
- Prominent card with border and subtle shadow
- Padding: p-6 on mobile, p-8 on desktop
- Rounded corners: rounded-lg
- Contains sequential form fields with clear labels

### 3. **Form Components**

**URL Input Field**:
- Full width with label above
- Height: h-12
- Rounded: rounded-md
- Border focus state with ring
- Placeholder: "https://example.com"

**Prompt Textarea**:
- Multi-line text area (rows: 6)
- Full width with label
- Rounded: rounded-md
- Placeholder: "Describe what you want to test... (e.g., 'Test all form validations and submit flows')"
- Auto-resize consideration

**Generate Button**:
- Primary action button
- Padding: px-6 py-3
- Rounded: rounded-md
- Font: font-medium text-sm
- Loading state with spinner
- Disabled state when processing

### 4. **Results Display**

**Status Banner**:
- Appears when generating/complete
- Padding: p-4
- Rounded: rounded-md
- Icons: Use Heroicons (check-circle, exclamation, loading spinner)

**Test Case Summary Card**:
- Grid display showing: Total tests, Test types, Coverage areas
- Three-column grid on desktop: grid-cols-1 md:grid-cols-3
- Gap: gap-4
- Each stat: Bordered card with p-4

**Test Case List**:
- Stacked layout with gap-4
- Each test case in expandable card
- Card structure:
  - Header: Test name + expand/collapse icon
  - Body: Code block with syntax highlighting
  - Footer: Copy button, test type badge

### 5. **Code Display Block**
- Background: Subtle contrast
- Padding: p-4
- Rounded: rounded-md
- Font: JetBrains Mono
- Scrollable: overflow-x-auto
- Copy button positioned top-right
- Line numbers optional (left margin)

### 6. **Action Buttons**

**Secondary Buttons** (Export, Save, Clear):
- Padding: px-4 py-2
- Border style
- Rounded: rounded-md
- Text: text-sm font-medium

**Icon Buttons** (Copy, Expand, Settings):
- Square: w-8 h-8
- Rounded: rounded
- Centered icons from Heroicons

### 7. **Empty States**
- Centered layout when no test cases generated
- Icon: Large icon (w-16 h-16) from Heroicons
- Title: text-lg font-medium
- Description: text-sm
- CTA: Generate button

### 8. **Badges**
For test types/categories:
- Small: px-2 py-1
- Rounded: rounded-full
- Text: text-xs font-medium
- Examples: "UI Test", "API Test", "E2E Test"

---

## Icons

**Library**: Heroicons (via CDN)
**Usage**:
- Input fields: magnifying-glass (URL), chat-bubble-left-right (prompt)
- Actions: play (generate), clipboard-document (copy), arrow-down-tray (export)
- Status: check-circle (success), exclamation-triangle (warning), arrow-path (loading)
- Navigation: cog-6-tooth (settings), document-text (docs)

---

## Accessibility Standards

- All form inputs with associated labels (for/id pairing)
- Focus indicators on all interactive elements (ring-2 ring-offset-1)
- ARIA labels for icon-only buttons
- Keyboard navigation support (Tab order logical)
- Loading states announced to screen readers
- Sufficient contrast ratios (AA minimum)
- Form validation with clear error messaging

---

## Responsive Behavior

**Mobile (base)**:
- Single column layout
- Full-width cards
- Stacked form fields
- Hamburger menu if needed

**Tablet (md:768px)**:
- Two-column grid for test case summary stats
- Slightly increased padding

**Desktop (lg:1024px)**:
- Three-column grid for stats
- Optimized code block width
- Side-by-side layouts where beneficial (form options + preview)

---

## Interactions & Micro-animations

**Use Sparingly**:
- Button hover: Subtle brightness shift (transition-colors duration-200)
- Card hover: Slight elevation increase (hover:shadow-md)
- Expand/collapse: Smooth height transition (transition-all duration-300)
- Loading spinner: Rotate animation
- Copy success: Brief checkmark flash

**Avoid**: Elaborate scroll animations, parallax effects, or distracting motion

---

## Special Considerations

**Code Syntax Highlighting**: 
Use Prism.js or Highlight.js via CDN for syntax-highlighted test case code blocks (JavaScript/TypeScript/Python syntax)

**Progressive Disclosure**:
- Initially show input form prominently
- Results section appears only after generation
- Expandable test cases to manage information density

**Performance**:
- Lazy load test case details if count exceeds 20
- Virtual scrolling for large test suites
- Debounced inputs where applicable

---

This design creates a professional, efficient developer tool that prioritizes clarity and usability while maintaining visual polish. The layout guides users through a clear workflow: input → generate → review → export, with each stage distinctly defined and accessible.