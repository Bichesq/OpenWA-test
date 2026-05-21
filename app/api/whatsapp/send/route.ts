import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { dispatchWhatsAppMessage } from '@/lib/whatsapp/handlers';
import { messageTemplates, TemplateKey } from '@/lib/whatsapp/templates';

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  try {
    const body = await req.json().catch(() => ({}));
    const { scenario } = body;

    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Missing "scenario" parameter in request body.', timestamp },
        { status: 400 }
      );
    }

    const config = getWhatsAppConfig();

    if (!config.enabled) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp integration is disabled in system configurations.', timestamp },
        { status: 403 }
      );
    }

    // 1. Resolve target identifier and description
    let target = '';
    let targetDescription = '';

    switch (scenario as TemplateKey) {
      case 'personal':
        target = config.myNumber;
        targetDescription = 'Personal WhatsApp Number';
        break;
      case 'registration':
        target = config.myNumber;
        targetDescription = 'Personal Number (Registration Alert)';
        break;
      case 'group':
        target = config.updatesGroupId;
        targetDescription = 'Updates Group Chat';
        break;
      case 'private':
        target = config.testClientId;
        targetDescription = 'Private Client Chat';
        break;
      case 'ping':
        target = config.myNumber;
        targetDescription = 'Personal Number (Ping)';
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Invalid test scenario: "${scenario}".`, timestamp },
          { status: 400 }
        );
    }

    // 2. Validate target existence
    if (!target) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Target variable is not configured for scenario "${scenario}". Please set the correct environment variables.`,
          timestamp
        },
        { status: 400 }
      );
    }

    // 3. Generate message content
    const templateFunction = messageTemplates[scenario as TemplateKey];
    const messageContent = templateFunction();

    console.log(`[API Send Route] Dispatching ${scenario} message to: ${targetDescription} (${target})`);

    // 4. Dispatch the message directly in-process
    const messageId = await dispatchWhatsAppMessage(target, messageContent);

    return NextResponse.json({
      success: true,
      message: `Successfully sent "${scenario}" message!`,
      messageId,
      target: targetDescription,
      content: messageContent,
      timestamp,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API Send Route] Internal execution error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error occurred.',
      timestamp,
    }, { status: 500 });
  }
}
