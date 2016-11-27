import mongoose from 'mongoose'
const Schema = mongoose.Schema

const treeSchema = new Schema({
  name: String,
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
