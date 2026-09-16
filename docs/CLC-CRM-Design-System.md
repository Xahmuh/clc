# CLC CRM — Design System (Web + Mobile)

Extracted from the reference screenshot so the Next.js portal and the React Native app render as the same product, not two different-looking tools.

**A note on precision:** the values below are read visually off the screenshot, not pixel-sampled from a file — they're close, but if you have the original Figma/design file, swap in the exact values there instead of trusting my estimate.

---

## 1. What the reference is actually doing

Worth naming before copying it: this design has almost no color. It's cream, white, near-black, and gray, with a single small green dot as the only accent. Status isn't color-coded (all Kanban cards look the same regardless of column) — emphasis happens by inverting ONE card to a dark background, not by assigning colors to states. That restraint is the whole personality of the design; adding status colors (green=won, red=lost, etc.) later would work against it, not with it.

---

## 2. Color Tokens

| Token | Value (approx.) | Used for |
|---|---|---|
| `cream-100` | `#F4F3E4` | The dashboard summary panel background — the one warm surface in the whole UI |
| `ink-900` | `#111111` | Primary text, primary buttons, and the single "featured" inverted card |
| `white` | `#FFFFFF` | Page background, sidebar, default cards |
| `gray-200` | `#E5E7EB` | Borders, dividers between sidebar sections |
| `gray-400` | `#9CA3AF` | Muted icons, placeholder/meta text |
| `gray-500` | `#6B7280` | Secondary text — card descriptions, member roles |
| `green-500` | `#22C55E` | The online-status dot only — this is the entire accent color budget |

No blue, no brand color, no per-status palette. If CLC's brand has a signature color, the one place it can enter without breaking the system is the "Add customer"-style primary button — but the reference itself uses ink-900 there, not a brand color.

---

## 3. Typography

The reference uses one clean grotesque sans-serif throughout — no serif, no second family. **Inter** is the closest freely-available match and works natively in both stacks (`next/font/google` on web, `@expo-google-fonts/inter` on mobile).

| Role | Size | Weight | Example in the reference |
|---|---|---|---|
| Display stat | 32–36px | 800 | "68%", "$15.890", "53" |
| Heading | 17–18px | 600 | "New customers", column titles |
| Card title | 15px | 600 | "ByteBridge", "SkillUp Hub" |
| Body | 13–14px | 400 | Card descriptions |
| Caption/meta | 12–13px | 500 | Dates, counts, role labels |

Sentence case throughout — nothing in the reference is set in all-caps, keep it that way.

---

## 4. Component Patterns

- **Cards:** white background, ~16px radius, 1px `gray-200` border, no drop shadow — flat, not floating. Padding ~20px.
- **Featured/emphasis card:** same shape, `ink-900` background, white text, `gray-400`-equivalent-at-70%-opacity for its secondary text. Used for the one item that deserves attention, not for a status.
- **Primary button:** `ink-900` background, white text, ~12px radius (e.g. "Add customer").
- **Count badge:** light gray pill, dark text, small (e.g. the "12", "17" next to column names).
- **Panel:** the cream dashboard summary card uses a larger radius (~24px) than the smaller cards inside the board — bigger containers get more rounding.
- **Icons:** thin-stroke outline style (`lucide-react` on web, `lucide-react-native` on mobile — one icon set, both platforms).

---

## 5. Web Implementation (Next.js + Tailwind)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        cream: { 100: '#F4F3E4' },
        ink: { 900: '#111111' },
        online: '#22C55E',
      },
      borderRadius: {
        panel: '24px',
        card: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
};
```

```tsx
// components/LeadCard.tsx
export function LeadCard({ lead, featured = false }: { lead: Lead; featured?: boolean }) {
  return (
    <div
      className={`rounded-card border p-5 ${
        featured
          ? 'bg-ink-900 text-white border-transparent'
          : 'bg-white text-ink-900 border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-[15px] font-semibold">{lead.company_name}</h3>
        <MoreVertical className={`h-4 w-4 ${featured ? 'text-white/60' : 'text-gray-400'}`} />
      </div>
      <p className={`mt-1 text-sm line-clamp-2 ${featured ? 'text-white/70' : 'text-gray-500'}`}>
        {lead.notes}
      </p>
      <div className={`mt-4 flex items-center gap-3 text-xs ${featured ? 'text-white/60' : 'text-gray-400'}`}>
        <Calendar className="h-3 w-3" />
        <span>{lead.follow_up_date ?? 'No due date'}</span>
      </div>
    </div>
  );
}
```

---

## 6. Mobile Implementation (React Native / Expo)

```ts
// theme.ts
export const colors = {
  cream: '#F4F3E4',
  ink: '#111111',
  white: '#FFFFFF',
  border: '#E5E7EB',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  online: '#22C55E',
};

export const radius = { panel: 24, card: 16, button: 12 };

export const type = {
  display: { fontFamily: 'Inter_800ExtraBold', fontSize: 34 },
  heading: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  caption: { fontFamily: 'Inter_500Medium', fontSize: 12 },
};
```

```tsx
// components/LeadCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, type } from '../theme';

export function LeadCard({ lead, featured = false }: { lead: Lead; featured?: boolean }) {
  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <Text style={[styles.title, featured && styles.textInverse]}>{lead.company_name}</Text>
      <Text style={[styles.body, featured && styles.textInverseMuted]} numberOfLines={2}>
        {lead.notes}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardFeatured: { backgroundColor: colors.ink, borderColor: 'transparent' },
  title: { ...type.cardTitle, color: colors.ink },
  body: { ...type.body, color: colors.textSecondary, marginTop: 4 },
  textInverse: { color: colors.white },
  textInverseMuted: { color: 'rgba(255,255,255,0.7)' },
});
```

---

## 7. Applying This to Screens Already in the Main Spec

- **Leads — Kanban view:** columns = `lead_status` (New / Contacted / Qualified / Negotiation / Won / Lost), each column header gets the count-pill treatment. Reserve the inverted dark card for the single highest-`estimated_value` lead in view — a genuine emphasis signal, not a rotating gimmick.
- **Admin Dashboard:** the cream `panel` component is the right container for the KPI row (open leads, conversion %, activities logged today) — same layout as the reference's "New customers / Successful deals / Tasks / Prepayments" row.
- **Mobile Home screen:** keep it white/ink only — the cream panel is a "management overview" surface, it doesn't need to appear on the field employee's quick-log-focused home screen.
