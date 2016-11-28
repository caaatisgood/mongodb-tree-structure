# Implementing Tree Structure in MongoDB
A way to implement tree structure with one Mongodb collection. Showing some basic ideas of schema design and CRUD concepts. Using [mongoose](http://mongoosejs.com/) and [Normalizr](https://github.com/paularmstrong/normalizr) in example code.

## Schema
Each document represents a tree node. It has "parent", "children" and "ancestors" field to save document id (provided by MongoDB) respectively as node reference.

Normally, you need to have one document to be the top node(or "Root") of your tree structure. Each node must refer to one any other nodes as their parent node, except the top node. A node can have zero to many child node. The "ancestors" holds all of the ancestor nodes' reference from top node all the way down to its parent node.
```javascript
// schema.js
import mongoose from 'mongoose'

const Schema = mongoose.Schema

const treeSchema = new Schema({
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Node'
  },
  children: [{
    type: Schema.Types.ObjectId,
    ref: 'Node'
  }],
  ancestors: [{
    type: Schema.Types.ObjectId,
    ref: 'Node'
  }]
})

export default mongoose.model('Node', treeSchema)
```

## CRUD
### Create
1. Find parent node document to get the "ancestors" for our new node.
2. Save the id of parent node and ancestor nodes when adding a new node.
3. Add the id of the new node to the parent node's children field.
```javascript
import Node from './schema'

async function create() {

  try {
  
    const parentNode = await Node.findOne({ _id: '<PARENT_NODE_ID>' })

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
```

### Retrieve
To retrieve all of the nodes is easy. But it might make less sense than retrieving the whole tree (or subtree) structure and make it like some kind of nested JSON object. So let's do this!:metal:

#### Retrieve the tree

Here's a light and simple way to carry out:

1. Retrieve nodes from MongoDB
2. Use [Normalizr](https://github.com/paularmstrong/normalizr) to make the query result of all nodes into id(key)->document(value) object. So that we can retrieve each node with its object id.
3. Use recursive function to trace through every nodes and build up the tree structure.

```javascript
import Node from './schema'
import { normalize, Schema, arrayOf } from 'normalizr'

async function getTree() {

  try {

    // Get all nodes if you need to retrieve the whole tree
    let nodes = await Node.find()
    // or you only need the subtree of the node you specified
    // let nodes = await Node.find({ $or: [{ _id: 'NODE_ID' }, { ancestors: 'NODE_ID'}] })

    // Define normalizr schema
    const nodeSchema = new Schema('nodes', { idAttribute: '_id' })

    // Normalize the nodes that were retrieved from MongoDB
    const normalized = normalize(nodes, arrayOf(nodeSchema))

    // Normalized nodes. It's a JSON object with document id as
    // key and document as value. You can get a document directly
    // by its id (e.g. nodes[<i>DocumentId</i>])
    nodes = normalized.entities.nodes

    // The result property of normalized data is an array that
    // holds all the id of each document. We don't need it in
    // this example. But it might be useful if you need to map
    // through the documents before building the tree.
    const ids = normalized.result

    // The recursive function to build the tree
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

// you can also add "parent": node.[node[id].parent]
// to the return object of the recursive function if  
// you want the populated result of each node's
// parent field.
```

### Update
#### Moving tree
```javascript
import Node from './schema'

async function update() {

  try {

    const node = await Node.findOne({ _id: '<NODE_ID>' })
  
    // Remove node from parent's children field
    Node.update({ _id: node.parent }, {
      $pull: { children: node._id }
    }).exec()
  
    // Add node to new parent node's children field
    Node.update({ _id: '<NEW_PARENT_NODE_ID>' }, {
      $push: { children: node._id }
    }).exec()
  
    // Change node's parent
    Node.update({ _id: node._id }, {
      parent: '<NEW_PARENT_NODE_ID>'
    }).exec()
    
  } catch (e) {
    // err handling
  }

}
```

### Delete
#### Remove a tree
```javascript
import Node from './schema'

async function remove() {
  
  try {

    // Find the target node
    const node = await Node.find({ _id: 'NODE_ID' })

    // Remove node from its parent's children field
    Node.update({ _id: node.parent }, {
      $pull: { children: node._id }
    }).exec()

    // Remove all subnodes of the target node
    Node.remove({
      ancestors: node._id
    }).exec()

    // Remove the target node
    Node.remove({
      _id: node._id
    })

    // return 

  } catch(e) {
    // err handling
  }

}
```

That's it! :octocat: 
