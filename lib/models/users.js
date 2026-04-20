class UsersModel {
  constructor(
    id,
    userLoginId,
    userEmail,
    fullName,
    roleId,
    role,
    phone,
    userAddress,
    activeStatus,
    isActive,
    password,
    userUniqueId,
    organization
  ) {
    this.userId = id;
    this.loginId = userLoginId;
    this.email = userEmail;
    this.userFullName = fullName;
    this.roleId = roleId;
    this.userRole = role;
    this.phone = phone;
    this.userAddress = userAddress;
    this.activeStatus = activeStatus;
    this.isActive = isActive;
    this.password = password;
    this.userUniqueId = userUniqueId;
    this.organization = organization;
  }
}

async function setUsersModel(recordset) {
  const users = await recordset.map(
    (user) =>
      new UsersModel(
        user.userId,
        user.loginId,
        user.email,
        user.userFullName,
        user.roleId,
        user.roleName,
        user.phone,
        user.userAddress,
        user.activeStatus,
        user.isActive,
        user.password,
        user.userUniqueId,
        user.organization
      )
  );
  return users;
}

async function setUsersModelById(recordsets) {
  const users = await recordsets[0].map(
    (user) =>
      new UsersModel(
        user.userId,
        user.loginId,
        user.email,
        user.userFullName,
        user.roleId,
        user.roleName,
        user.phone,
        user.userAddress,
        user.activeStatus,
        user.isActive,
        user.password,
        user.userUniqueId,
        user.organization
      )
  );
  return users;
}

export { setUsersModel, setUsersModelById };
export default UsersModel;
