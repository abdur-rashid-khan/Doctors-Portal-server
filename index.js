
const express = require("express");
require('dotenv').config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('DB connected')
})
// Replace the uri string with your MongoDB deployment's connection string.
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lqf9l.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const doctorsCollection = client.db('doctors-portal').collection('services');
    const bookingCollection = client.db('doctors-portal').collection('booking');


    app.get('/services', async(req , res )=>{
      const query = {};
        const cursor =  doctorsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })

    // for booking 
    app.post('/booking', async (req , res)=>{
      const booking = req.body;
      const query = {treatment:booking.treatment , date:booking.date, patient:booking.patient  }
      const cursor = await bookingCollection.findOne(query);
      if(cursor){
        return res.send({success:false,booking:cursor});
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({success:true,result});
    })

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`localhost ${port}`) 
})