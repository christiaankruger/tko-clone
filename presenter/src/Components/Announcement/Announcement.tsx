import React, { FC } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Announcement.scss';
import { Heading } from '../shared/Heading';

const BEM = createBemHelper('announcement');

export interface AnnouncementProps {
  heading: string;
  subtext?: string;
}

export const Announcement: FC<AnnouncementProps> = (props) => {
  const { heading, subtext } = props;
  return (
    <div className={BEM()}>
      <Heading>{heading}</Heading>
      {subtext && <div className={BEM('subtext')}>{subtext}</div>}
    </div>
  );
};
