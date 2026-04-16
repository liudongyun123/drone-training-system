exports.main = async (event, context) => {
  console.log('Test function called with:', event)
  return {
    code: 0,
    message: 'ok',
    received: event
  }
}
