const DysmsapiModule = require('@alicloud/dysmsapi20170525');
const Dysmsapi = DysmsapiModule.default;
const OpenApi = require('@alicloud/openapi-client');
const { default: Credential } = require('@alicloud/credentials');
const config = require('./config');

const credential = new Credential({
  type: 'ecs_ram_role',
});

const apiConfig = new OpenApi.Config({
  credential,
  regionId: config.sms.regionId,
  endpoint: `dysmsapi.aliyuncs.com`,
});

const client = new Dysmsapi(apiConfig);

async function sendSms(phone, code, purpose = 'register') {
  const templateCode = config.sms.templateCode;
  if (!templateCode) {
    console.log(`[SMS] No template configured, dev mode. Code for ${phone}: ${code}`);
    return true;
  }
  const req = new DysmsapiModule.SendSmsRequest({
    phoneNumbers: phone,
    signName: config.sms.signName,
    templateCode,
    templateParam: JSON.stringify({ code }),
    outId: `${purpose}_${Date.now()}`,
  });
  const resp = await client.sendSms(req);
  if (resp.body.code !== 'OK') {
    throw new Error(`SMS send failed: ${resp.body.message}`);
  }
  return resp;
}

module.exports = { sendSms };
