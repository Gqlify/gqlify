import moment from 'moment-timezone';
import {ObjectID} from 'mongodb';
export default class ActivityLogManager {
  private user: any;
  private collectionName: any;
  private db: any;
  private oldValue: any;
  private activityLogCollection: any;

  constructor(db, user, collectionName) {
    this.user = user;
    this.collectionName = collectionName;
    this.db = db;
    this.activityLogCollection = db.collection('activityLog');
  }
  //Salva l'oldValue per poter salvare un update o un delete
  public async getOldValue(filterQuery) {
    this.oldValue = await this.db
      .collection(this.collectionName)
      .findOne(filterQuery);

    return this.oldValue;
  }

  public async logCreate(insertedItemId) {
    const now = moment().toDate();

    const newValue = await this.db.collection(this.collectionName).findOne({
      _id: insertedItemId
    });

    const logId = new ObjectID();
    await this.activityLogCollection.insertOne({
      _id: logId,
      id: logId.toString(),
      action: 'create',
      collectionName: this.collectionName,
      itemId: newValue.id,
      userId: this.user ? this.user.id : null,
      date: now,
      newValue: newValue
    });
  }

  public async logUpdate() {
    if (!this.oldValue) return;
    const now = moment().toDate();
    const newValue = await this.db
      .collection(this.collectionName)
      .findOne({id: this.oldValue.id});
    const logId = new ObjectID();
    await this.activityLogCollection.insertOne({
      _id: logId,
      id: logId.toString(),
      action: 'update',
      oldValue: this.oldValue,
      newValue: newValue,
      collectionName: this.collectionName,
      itemId: newValue.id,
      userId: this.user ? this.user.id : null,
      date: now
    });
  }

  public async logDelete() {
    if (!this.oldValue) return;
    const logId = new ObjectID();
    await this.activityLogCollection.insertOne({
      _id: logId,
      id: logId.toString(),
      action: 'delete',
      collectionName: this.collectionName,
      itemId: this.oldValue.id,
      userId: this.user ? this.user.id : null,
      date: moment().toDate(),
      oldValue: this.oldValue
    });
  }

  public async logOneRelation(oldValueUnlinkFrom, oldValueLinkTo) {
    const newValueUnlinkFrom = oldValueUnlinkFrom
      ? await this.db.collection(this.collectionName).findOne({
          id: oldValueUnlinkFrom.id
        })
      : undefined;

    const newValueLinkTo = await this.db
      .collection(this.collectionName)
      .findOne({
        id: oldValueLinkTo.id
      });
    const logId = new ObjectID();
    await this.activityLogCollection.insertOne({
      _id: logId,
      id: logId.toString(),
      action: 'oneRelation',
      collectionName: this.collectionName,
      linkToItemId: newValueLinkTo.id,
      unlinkFromItemId: oldValueUnlinkFrom ? oldValueUnlinkFrom.id : undefined,
      userId: this.user ? this.user.id : null,
      linkToOldValue: oldValueLinkTo,
      linkToNewValue: newValueLinkTo,
      unlinkFromOldValue: oldValueUnlinkFrom,
      unlinkFromNewValue: newValueUnlinkFrom,
      date: moment().toDate()
    });
  }

  public async logManyRelation() {
    if (!this.oldValue) return;
    const newValue = await this.db.collection(this.collectionName).findOne({
      _id: this.oldValue._id
    });
    const logId = new ObjectID();
    await this.activityLogCollection.insertOne({
      _id: logId,
      id: logId.toString(),
      action: 'manyRelation',
      collectionName: this.collectionName,
      oldValue: this.oldValue,
      newValue: newValue,
      userId: this.user ? this.user.id : null,
      date: moment().toDate()
    });
  }
}
