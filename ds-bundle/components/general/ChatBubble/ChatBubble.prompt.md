ChatBubble from @signalbridge/web. Use via `window.SignalBridge.ChatBubble` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### YouthMessage

```jsx
() => (
  <div style={{ padding: '16px', maxWidth: 400 }}>
    <ChatBubble sender="youth" author="Mira" timestamp="11:42 PM">
      I'm feeling really overwhelmed right now. I don't know what to do next.
    </ChatBubble>
  </div>
)
```

### AssistantMessage

```jsx
() => (
  <div style={{ padding: '16px', maxWidth: 400 }}>
    <ChatBubble sender="assistant" author="SafeNight" timestamp="11:43 PM">
      I hear you. Let's take this one step at a time. You're safe here, and
      we're going to figure this out together.
    </ChatBubble>
  </div>
)
```

### SystemMessage

```jsx
() => (
  <div style={{ padding: '16px', maxWidth: 400 }}>
    <ChatBubble sender="system" author="System">
      Handoff note created — your worker will be in touch tomorrow morning.
    </ChatBubble>
  </div>
)
```

### ConversationThread

```jsx
() => (
  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 500 }}>
    <ChatBubble sender="youth" author="Mira" timestamp="11:40 PM">
      Hey, is anyone there?
    </ChatBubble>
    <ChatBubble sender="assistant" author="SafeNight" timestamp="11:40 PM">
      Hi Mira, I'm here. Tell me what's going on.
    </ChatBubble>
    <ChatBubble sender="youth" author="Mira" timestamp="11:41 PM">
      I had another argument with my mum. I don't want to go home tonight.
    </ChatBubble>
    <ChatBubble sender="assistant" author="SafeNight" timestamp="11:42 PM">
      That sounds really hard. You did the right thing reaching out. Let's
      talk about your options for tonight.
    </ChatBubble>
    <ChatBubble sender="system" author="System">
      Worker handoff scheduled for 9 AM tomorrow.
    </ChatBubble>
  </div>
)
```
