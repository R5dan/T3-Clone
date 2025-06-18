# Model Selector Component

A comprehensive React Next.js model selector component with three levels of organization, authentication checks, and rich visual indicators.

## Features

### 🎯 Three Organization Levels
- **Favourites**: Up to 10 user-selected models (stored in localStorage)
- **More**: Popular models curated for quick access
- **All**: Complete model list with search functionality

### 🔐 Authentication & Access Control
- Free models available to all users
- Premium models require authentication and OpenRouter API key
- Visual indicators for locked/unavailable models

### 🎨 Rich Visual Design
- **Provider Icons**: Color-coded icons for each AI provider (OpenAI, Anthropic, Google, etc.)
- **Capability Badges**: Visual indicators for model capabilities:
  - 🖼️ Image processing
  - 📄 File parsing
  - 🧠 Reasoning capabilities
  - 💻 Code generation
  - 👁️ Vision capabilities
- **Free Model Badges**: Clear indication of free vs premium models

### 🔍 Search & Filtering
- Real-time search across model names, IDs, and providers
- Custom model ID input for advanced users
- Responsive grid layout

## Usage

### Basic Implementation

```tsx
import { ModelSelector } from "~/app/chat/[threadId]/modelSelector";
import { DEFAULT_MODEL } from "~/server/workos/defaults";
import type { MODEL_IDS } from "~/server/chat/types";

function MyComponent() {
  const [selectedModel, setSelectedModel] = useState<MODEL_IDS>(DEFAULT_MODEL);

  return (
    <ModelSelector
      selectedModel={selectedModel}
      onModelSelect={setSelectedModel}
    />
  );
}
```

### With Custom Styling

```tsx
<ModelSelector
  selectedModel={selectedModel}
  onModelSelect={setSelectedModel}
  className="max-w-6xl mx-auto"
/>
```

## Component Structure

### Props Interface
```tsx
interface ModelSelectorProps {
  selectedModel: MODEL_IDS;           // Currently selected model
  onModelSelect: (model: MODEL_IDS) => void;  // Callback when model is selected
  className?: string;                 // Optional CSS classes
}
```

### Internal State Management
- **Favourites**: Stored in localStorage, max 10 models
- **Search**: Real-time filtering
- **Custom Models**: Temporary input state
- **Authentication**: Uses WorkOS AuthKit

## Model Categories

### Favourites Tab
- User-curated list of up to 10 models
- Star/unstar functionality
- Persistent storage in localStorage
- Default includes Auto and a free model

### More Tab
- Curated list of popular models:
  - OpenAI GPT-4o models
  - Anthropic Claude models
  - Google Gemini models
  - Mistral models
  - DeepSeek models
  - Meta Llama models
  - Qwen models
  - Cohere models

### All Tab
- Complete model list from `MODELS` array
- Search functionality
- Custom model input
- Provider and capability filtering

## Authentication Integration

The component integrates with WorkOS AuthKit for user authentication:

```tsx
const { user, loading } = useAuth();
```

### Access Control Logic
```tsx
const canUseModel = (modelId: string) => {
  if (isFreeModel(modelId)) return true;
  return user && user.metadata?.openRouterKey;
};
```

## Visual Indicators

### Provider Icons
Each AI provider has a unique color-coded icon:
- OpenAI: Green
- Anthropic: Orange
- Google: Blue
- Mistral: Purple
- DeepSeek: Indigo
- Meta: Blue-600
- Qwen: Red
- Cohere: Pink
- And many more...

### Capability Badges
- **Image**: Blue badge with image icon
- **File**: Gray badge with file icon
- **Reasoning**: Green badge with brain icon
- **Code**: Yellow badge with code icon

### Status Indicators
- **Free Models**: Green "Free" badge
- **Locked Models**: Lock icon and reduced opacity
- **Selected Model**: Blue ring border

## Styling

The component uses Tailwind CSS v4 with built-in utilities:
- Responsive grid layout (1-3 columns based on screen size)
- Hover effects and transitions
- Consistent spacing and typography
- Dark mode support
- Text truncation using `overflow-hidden` and `max-h-8`

## Dependencies

### Required Packages
- `@workos-inc/authkit-nextjs`: Authentication
- `lucide-react`: Icons
- `class-variance-authority`: Component variants
- `clsx`: Conditional classes
- `tailwind-merge`: Class merging

### UI Components Used
- `Button`: Interactive elements
- `Card`: Model containers
- `Input`: Search and custom model input
- `Badge`: Capability indicators
- `ScrollArea`: Scrollable content

## Demo

Visit `/model-selector-demo` to see the component in action with a live preview of the selected model information.

## Customization

### Adding New Providers
Update the `PROVIDER_ICONS` object:
```tsx
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  newprovider: <div className="w-4 h-4 bg-custom-color rounded" />,
  // ... existing providers
};
```

### Modifying Popular Models
Update the `POPULAR_MODELS` array:
```tsx
const POPULAR_MODELS = [
  "your/custom-model",
  // ... existing models
];
```

### Custom Capability Detection
Modify the `getCapabilityBadges` function to add new capability types or detection logic.

## Best Practices

1. **Performance**: The component uses `useMemo` for expensive computations
2. **Accessibility**: Proper ARIA labels and keyboard navigation
3. **Responsive Design**: Works on all screen sizes
4. **Error Handling**: Graceful handling of missing data
5. **Type Safety**: Full TypeScript support

## Troubleshooting

### Common Issues

1. **Models not loading**: Check that `MODELS` array is properly imported
2. **Authentication not working**: Verify WorkOS configuration
3. **Styling issues**: Ensure Tailwind CSS is properly configured
4. **LocalStorage errors**: Check for SSR compatibility

### Debug Mode
Add console logs to debug model filtering and selection:
```tsx
console.log("Available models:", MODELS.length);
console.log("Selected model:", selectedModel);
console.log("User auth status:", !!user);
```

## Technical Notes

- Uses Tailwind CSS v4 utilities for styling
- Text truncation implemented with `overflow-hidden` and `max-h-8`
- No custom CSS required - all styling done with Tailwind classes
- Fully compatible with Next.js 15 and React 19 