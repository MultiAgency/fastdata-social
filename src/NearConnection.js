import * as near from '@fastnear/api';

// called by FileUploader's handleSendToNear
export const sendFilesToNear = async (files, contractId) => {
  // you're a global now, harry
  window.near = near

  // note: this is where we're going to want to do the borsh side next
  // below is the MVP throwing some details into base64

  try {
    // extract base64 data from files object
    const fileData = Object.values(files).map(file => ({
      name: file.name,
      type: file.type,
      data: file.base64
    }));

    console.log(`Sending ${fileData.length} files to ${contractId}`);
    console.log('files', files)

    // construct array with basic file details
    const fileArray = Object.values(files).map((f) => ({
      name: f.name,
      type: f.type,
      size: f.size,
      base64: f.base64,
    }));

    const result = await near.sendTx({
      receiverId: contractId,
      actions: [
        near.actions.functionCall({
          methodName: "__fastdata_fastfs",
          args: {
            // perhaps the arg name can carry information
            // and will be changed to borsh_v0 soon
            base64_v0: fileArray
          },
          gas: near.utils.convertUnit("250 Tgas"),
          deposit: "0",
        }),
      ],
    });

    console.log('__fastdata_fastfs immediate result', result);
    return result;
  } catch (error) {
    console.error('Error sending files to NEAR:', error);
    return {
      success: false,
      error: error
    };
  }
};
