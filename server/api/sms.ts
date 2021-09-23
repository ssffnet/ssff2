import { SmsClient, SmsSendResult } from '@azure/communication-sms';

const connectionString = "endpoint=https://payg-comms.communication.azure.com/;accesskey=/is1ZkXA1AKmiaeS/9phyZHjt/iqNRiISwQicgnpftxQocwB2D2iuFxMU3IuSt/VXR9gkPlLPwjUl3yHvSkvjQ==";

// Instantiate the SMS client
const smsClient = new SmsClient(connectionString);


export async function send(message: string): Promise<SmsSendResult[]> {

    const sendResults = await smsClient.send({
        from: "+18332560618",
        to: ["+12532552284"],
        message: message
    });

    console.log(JSON.stringify(sendResults));

    return sendResults;
}