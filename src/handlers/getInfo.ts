//import { i18nFactory } from '../factories'
import { Handler } from './index'
import { logger } from '../utils/logger'

export const getInfoHandler: Handler = async function (msg, flow, hermes) {
    logger.debug('getInfoHandler')
    // Ready to be set 

    flow.end()

    // Return the TTS speech.
    // const i18n = i18nFactory.get()
    // return i18n()
}