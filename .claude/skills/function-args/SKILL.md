---
name: function-args
description: Use when defining or modifying any function/method signature — enforces argument-passing convention. 1–2 args = positional parameters; 3+ args = single object parameter (named/destructured).
---

# Function Arguments Convention

How to pass arguments into functions in this codebase.

## Rule

- **1–2 arguments** → positional parameters.
- **3 or more arguments** → single object parameter, destructured at the call site and in the signature.

This applies to all functions, methods, controllers, services, repos, helpers, and utilities — backend and frontend.

## Why

- Few args: positional is shortest, type-checked, no boilerplate.
- Many args: positional becomes order-dependent and unreadable at call sites (`fn(true, null, 5, "x")`). Object keeps call sites self-documenting and lets you add/reorder fields without breaking callers.

## How to apply

### 1–2 args → positional

```ts
// good
function getUserById(id: string) { ... }
function transferFunds(fromId: string, toId: string) { ... }

// bad — over-engineered
function getUserById({ id }: { id: string }) { ... }
```

### 3+ args → object

```ts
// good
interface CreateOrderInput {
  userId: string
  items: OrderItem[]
  couponCode?: string
  shippingAddressId: string
}
function createOrder({ userId, items, couponCode, shippingAddressId }: CreateOrderInput) { ... }

createOrder({
  userId: "u_1",
  items,
  shippingAddressId: "addr_2",
})

// bad — positional, order-dependent, unreadable
function createOrder(userId: string, items: OrderItem[], couponCode: string | undefined, shippingAddressId: string) { ... }
createOrder("u_1", items, undefined, "addr_2")
```

### Counting rules

- Count required + optional + DI/deps as one each.
- Default-value params still count.
- A trailing `deps` / `ctx` injection param counts toward the total. Example: `fn(id, name, deps)` = 3 args → convert to object.
- Rest params (`...args`) count as 1.
- `this` does not count.

### Edge cases

- **Standard library / framework callbacks** with fixed signatures (`Array.map((item, i) => ...)`, event handlers, Vue/React hooks) — keep their native signature, do not refactor.
- **Overloads / curried functions** — apply rule per signature.
- **Constructors** — same rule. 3+ params → object.

## When refactoring

If you touch a function that violates the rule, fix it as part of the change. Update all call sites in the same edit. Do not leave half-converted signatures.

## Checklist before finishing

- [ ] Every new/changed function with ≥3 args takes a single object.
- [ ] Every new/changed function with ≤2 args uses positional params (no needless object wrapping).
- [ ] Call sites updated.
- [ ] Types/interfaces for object params named (`CreateOrderInput`, `IFooDeps`, etc.) when reused; inline type OK if used once.
