# Implementing Tree Structure in MongoDB
A way to implement tree structure with one Mongodb collection. Showing some basic ideas of schema design and CRUD concepts.

## Schema
Each document represents a tree node. It has "parent" field and "children" field to save its parent's or children's document id (provided by MongoDB) as node reference.

Normally, you need to have one document to be the top node(or "Root") of your tree structure. Each node must refer to one any other nodes as their parent node, except the top node.
```
// schema.js
import mongoose from 'mongoose'

const Schema = mongoose.Schema

const treeSchema = new Schema({
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Node'
  }
  children: [{
    type: Schema.Types.ObjectId,
    ref: 'Node'
  }]
})

export default mongoose.model('Node', treeSchema)

```

## CRUD
### Create
Save the id of parent node when adding a new node.
<pre>
import Node from './schema'

const doc = new Node({
  parent: <b><i>ParentNodeId</i></b>
})

doc.save()
</pre>

### Retrieve
#### Retrieve the whole tree
To retrieve all of the nodes is easy. But it might make less sense than retrieving the whole tree structure and make it like some kind of nested JSON object. So let's do this!

Here's a light and simple way for me to carry out:

1. Retrieve all nodes from MongoDB
2. Use [Normalizr](https://github.com/paularmstrong/normalizr) to make the query result of all nodes into id(key)->document(value) object. So that we can retrieve each node with its object id.
3. Use recursive function to trace through every nodes and build up the tree structure.
<pre>
import Node from './schema'
import { normalize, Schema, arrayOf } from 'normalizr'

async function getTree() {

  let nodes = await Node.find()
  
  const nodeSchema = new Schema('nodes', { idAttribute: '_id' })
  
  const normalized = normalize(nodes, arrayOf(nodeSchema))
  
  nodes = normalized.entities.nodes
  
  const ids = normalized.result

  // recursive function
  const makeTree = id => {
    return Object.assign({}, nodes[id], {
      children: nodes[id].children.map(makeTree)
    })
  }

  return makeTree(<b><i>TopNodeId</i></b>)
  
}

// you can also add <b>"parent": node.[node[id].parent]</b>
// to the return object of the recursive function if  
// you want the populated result of each node's
// parent field.
</pre>

### Update
#### Changing parent node
<pre>
import Node from './schema'

async function update() {

  const node = await Node.findOne({ _id: <b><i>NodeId</i></b> })
  
  // remove node from parent's children field
  Node.update({ _id: node.parent }, {
    $pull: { children: node._id }
  }).exec()
  
  // add node to new parent node's children field
  Node.update({ _id: <b><i>NewParentNodeId</i></b> }, {
    $push: { children: node._id }
  }).exec()
  
  // change node's parent
  Node.update({ _id: node._id }, {
    parent: <b><i>NewParentNodeId</i></b>
  }).exec()
}
</pre>

### Delete

Should I add "ancestors" field? It would be way more easy to remove a subtree if you have ancestors field...