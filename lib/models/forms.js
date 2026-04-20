class FormsModel {
  constructor(
    id,
    formName,
    formDescription,
    formJson,
    Status,
    Modifydate,
    UniqueId,
    Creationby,
    Modifyby,
    Version,
    baselineScore
  ) {
    this.formId = id;
    this.formName = formName;
    this.formDescription = formDescription;
    this.formJson = formJson;
    this.Status = Status;
    this.Modifydate = Modifydate;
    this.UniqueId = UniqueId;
    this.Creationby = Creationby;
    this.Modifyby = Modifyby;
    this.Version = Version;
    this.baselineScore = baselineScore;
  }
}

export default FormsModel;
