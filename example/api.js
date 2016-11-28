import Node from './schema'
import { normalize, Schema, arrayOf } from 'normalizr'

// create
async function create() {

  try {

    const parentNode = await Node.findOne({ _id: 'PARENT_ID' })

    const node = new Node({
      parent: parentNode._id,
      ancestors: parentNode.parent.concat(parentNode._id)
    })
    
    const newNode = await node.save()

    await Node.update({ _id: parentNode._id }, {
      $push: { children: newNode._id }
    }).exec()

    return newNode

  } catch (e) {
    // error handling
  }

}

// retrieve
async function getTree() {

  try {

    let nodes = await Node.find()
    
    const nodeSchema = new Schema('nodes', { idAttribute: '_id' })
    const normalized = normalize(nodes, arrayOf(nodeSchema))
    nodes = normalized.entities.nodes
    const ids = normalized.result

    const makeTree = id => {
      return Object.assign({}, nodes[id], {
        children: nodes[id].children.map(makeTree)
      })
    }

    return makeTree('NODE_ID')
    
  } catch (e) {
    // err handling
  }

}

// update
async function update() {

  try {

    const node = await Node.findOne({ _id: 'NODE_ID' })

    Node.update({ _id: node.parent }, {
      $pull: { children: node._id }
    }).exec()

    Node.update({ _id: 'NEW_PARENT_NODE_ID' }, {
      $push: { children: node._id }
    }).exec()

    Node.update({ _id: node._id }, {
      parent: 'NEW_PARENT_NODE_ID'
    }).exec()

  } catch (e) {
    // err handling
  }
  
}

// delete
async function remove() {
  
  try {

    const node = await Node.find({ _id: 'NODE_ID' })

    Node.update({ _id: node.parent }, {
      $pull: { children: node._id }
    }).exec()

    Node.remove({
      ancestors: node._id
    }).exec()

    Node.remove({
      _id: node._id
    })

    // return 

  } catch(e) {
    // err handling
  }

}