import { registerMethod } from 'did-resolver'
import UportLite from 'uport-lite'

export function convertToDid (did, legacy) {
  const publicKey = [{
    id: `${did}#keys-1`,
    type: 'EcdsaPublicKeySecp256k1',
    owner: did,
    publicKeyHex: legacy.publicKey.slice(2)
  }]
  if (legacy.publicEncKey) {
    publicKey.push({
      id: `${did}#keys-2`,
      type: 'Curve25519EncryptionPublicKey',
      owner: did,
      publicKeyBase64: legacy.publicEncKey
    })
  }
  const doc = {
    '@context': 'https://w3id.org/did/v1',
    id: did,
    publicKey
  }
  if (legacy.name || legacy.description || legacy.image) {
    const profile = Object.assign({}, legacy)
    delete profile['publicKey']
    delete profile['publicEncKey']
    doc.uportProfile = profile
  }
  return doc
}

function register (configured) {
  const cpsRegistry = configured || UportLite()

  const registry = mnid => new Promise((resolve, reject) => {
    cpsRegistry(mnid, (error, doc) => error ? reject(error) : resolve(doc))
  })

  function resolve (did, parsed) {
    return new Promise((resolve, reject) => {
      registry(parsed.id).then(doc => {
        if (!doc) return resolve()
        // Check if real DID document or legacy
        if (doc['@context'] === 'https://w3id.org/did/v1') return resolve(doc)
        if (typeof doc['publicKey'] === 'string') {
          return resolve(convertToDid(did, doc))
        }
      }, reject)
    })
  }
  
  registerMethod('uport', resolve) 
}

module.exports = register