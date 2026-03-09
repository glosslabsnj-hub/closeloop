import re

with open('supabase/functions/ai-plan-response/index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add service keyword to inline retrieveKnowledge service search text
old1 = "    const searchText = `${svc.name} ${svc.description || ''} ${svc.preparation_instructions || ''}`;"
new1 = "    // Include \"service\" keyword so generic queries (\"what services do you offer?\") always match\n    const searchText = `${svc.name} service ${svc.description || ''} ${svc.preparation_instructions || ''}`;"

# Fix 2: Detect quota errors in HTTP error handling
old2 = """    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => '');
      throw new Error(`Anthropic API error: ${aiResponse.status} ${errText}`);
    }"""
new2 = """    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => '');
      const isQuotaError = aiResponse.status === 429 || errText.includes('credit') || errText.includes('quota') || errText.includes('overloaded');
      if (isQuotaError) {
        return { reply: "I'm having a brief technical issue. Please try again in a moment.", next_action: 'error' as any };
      }
      throw new Error(`Anthropic API error: ${aiResponse.status} ${errText}`);
    }"""

# Fix 3: catch block - use 'error' not 'escalate' for quota failures
old3 = """  } catch (error) {
    console.error("AI generation error:", error);
    return {
      reply: brain.ai_settings?.fallback || "I'd be happy to help! Let me have someone get back to you shortly.",
      next_action: 'escalate',
    };
  }"""
new3 = """  } catch (error) {
    const errMsg = String(error);
    const isQuota = errMsg.includes('credit') || errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('overloaded');
    console.error("AI generation error:", error);
    return {
      reply: isQuota ? "I'm having a brief technical issue. Please try again in a moment." : (brain.ai_settings?.fallback || "I'd be happy to help! Let me have someone get back to you shortly."),
      next_action: (isQuota ? 'error' : 'escalate') as any,
    };
  }"""

changed = content

if old1 in changed:
    changed = changed.replace(old1, new1)
    print('Fix 1 (service keyword) applied')
else:
    print('Fix 1 NOT found - checking snippet:')
    idx = changed.find('for (const svc of services)')
    if idx >= 0:
        print(repr(changed[idx:idx+200]))

if old2 in changed:
    changed = changed.replace(old2, new2)
    print('Fix 2 (quota HTTP error) applied')
else:
    print('Fix 2 NOT found')

if old3 in changed:
    changed = changed.replace(old3, new3)
    print('Fix 3 (quota catch block) applied')
else:
    print('Fix 3 NOT found')

with open('supabase/functions/ai-plan-response/index.ts', 'w', encoding='utf-8') as f:
    f.write(changed)
print('File written')
