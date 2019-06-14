import { withHermes, Dialog } from 'hermes-javascript'
import bootstrap from './bootstrap'
import { mode, translation, logger } from './utils'
import { configFactory } from './factories'
import { 
    onIntentDetected,
    onSessionToggle
} from './binding'
import { SnipsPlayer } from './SnipsPlayer'
import { HandlerOptions } from './handlers'
import {
    CONFIDENCE_DEFAULT
} from './constants'

// Initialize hermes
export default function ({
    hermesOptions = {},
    bootstrapOptions = {}
} = {}) : Promise<() => void>{
    return new Promise((resolve, reject) => {
        withHermes(async (hermes, done) => {
            try {
                // Bootstrap config, locale, i18n…
                await bootstrap(bootstrapOptions)
                const config = configFactory.get()

                const say: any = (text: string, siteId?: string) => {
                    hermes.dialog().publish('start_session', {
                        init: {
                            type: Dialog.enums.initType.notification,
                            text
                        },
                        siteId
                    })
                }

                const onPlaying = () => {
                    // Context control if it's enabled
                    if(config.contextControl) {
                        mode.setPlaying(hermes.dialog())
                    }

                    // Sound feedback control if it's enabled
                    if(config.soundFeedbackControl) {
                        hermes.feedback().publish('notification_off', {
                            siteId: 'default'
                        })
                    }
                }

                const onPausing = () => {
                    // Context control if it's enabled
                    if(config.contextControl) {
                        mode.setPausing(hermes.dialog())
                    }

                    // Sound feedback control if it's enabled
                    if(config.soundFeedbackControl) {
                        hermes.feedback().publish('notification_on', {
                            siteId: 'default'
                        })
                    }
                }

                const onStopping = () => {
                    // Context control if it's enabled
                    if(config.contextControl) {
                        mode.setInit(hermes.dialog())
                    }

                    // Sound feedback control if it's enabled
                    if(config.soundFeedbackControl) {
                        hermes.feedback().publish('notification_off', {
                            siteId: 'default'
                        })
                    }
                }

                const musicPlayer = new SnipsPlayer({
                    host: String(config.mpdHost) || 'localhost',
                    port: Number(config.mpdPort) || 6600,
                    volumeAutoReset: Boolean(config.volumeAutoReset) || undefined,
                    volumeTimeout: Number(config.volumeTimeout) || undefined,
                    playerMode: String(config.playerModeDefault) || undefined,
                    onReady: () => say(translation.random('info.ready')),
                    onDisconnect: () => say(translation.random('error.mpdConnectionEnd')),
                    onConnectionFaild: () => say(translation.random('error.mpdConnectionFaild')),
                    onPlaying,
                    onPausing,
                    onStopping
                })

                // connect to mpd server, retry for 3 times in case it's booting
                await musicPlayer.connect(3, 30)

                if (!config.contextControl) {
                    mode.setAllEnabled(hermes.dialog())
                }
                
                // subscribe to intent handlers
                const handlerOptions: HandlerOptions = {
                    confidenceScore: {
                        intentStandard: Number(config.confidenceIntentStanderd) || CONFIDENCE_DEFAULT.INTENT_STANDARD,
                        intentDrop: Number(config.confidenceIntentDrop) || CONFIDENCE_DEFAULT.INTENT_DROP,
                        slotDrop: Number(config.confidenceSlotDrop) || CONFIDENCE_DEFAULT.SLOT_DROP,
                        asrDrop: Number(config.confidenceAsrDrop) || CONFIDENCE_DEFAULT.ASR
                    }
                }

                logger.debug(config)
                //logger.debug(handlerOptions.confidenceScore)

                onIntentDetected(hermes, musicPlayer, handlerOptions)
                // subscribe to sessionStarted and sessionEnded
                onSessionToggle(hermes, musicPlayer)
    
                resolve(done)
            } catch (error) {
                // Output initialization errors to stderr and exit
                const message = await translation.errorMessage(error)
                logger.error(message)
                logger.error(error)
                // Exit
                done()
                // Reject
                reject(error)
            }
        }, hermesOptions)
    })
}