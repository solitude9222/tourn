/** Idempotent startup migration: secondary aliases are retired, not inventory ownership. */
export const SINGLE_ALIAS_SCHEMA=`
update users set alias2=null,alias2_updated_at=null where alias2 is not null or alias2_updated_at is not null;
update users set alias_required=true where (alias is null or btrim(alias)='') and alias_required=false;
`;

/** Database rows use snake_case; a pending alias choice also blocks writes. */
export const needsPrimaryAlias=user=>!user?.alias?.trim()||user.alias_required===true;
